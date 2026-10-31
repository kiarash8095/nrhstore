<?php
defined('ABSPATH') || exit;

/** Keep orders, credentials, idempotency and bank verification inside WordPress. */
final class NRH_Headless_Checkout {
    private const META = '_nrh_sadad_payment';
    private const TRANSFER_META = '_nrh_bank_transfer';
    private const ATTEMPTS = '_nrh_checkout_attempts';
    private const BANK = 'https://sadad.shaparak.ir/VPG/';
    private ?array $context = null;
    private array $locks = [];

    public function register(): void {
        add_action('rest_api_init', [$this, 'routes']);
        add_action('woocommerce_rest_checkout_process_payment_with_context', [$this, 'process_payment'], 5, 2);
        add_filter('rest_post_dispatch', [$this, 'no_cache'], 10, 3);
        add_action('woocommerce_api_wc_gateway_melli', [$this, 'guard_legacy_payment'], -100);
        add_action('woocommerce_receipt_melli_pay', [$this, 'guard_legacy_payment'], -100);
        add_action('shutdown', [$this, 'release'], PHP_INT_MAX);
    }

    /** NRH orders must use their bound token/verified callback, including when
     * someone visits the old gateway's public receipt or callback directly. */
    public function guard_legacy_payment($order_id = null): void {
        // This only denies legacy processing; bank webhooks cannot carry a WP
        // nonce. Requiring one here would bypass the guard on forged callbacks.
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only denial guard, never grants payment or account access.
        $legacy_id = isset($_GET['wc_order']) ? sanitize_text_field(wp_unslash($_GET['wc_order'])) : null;
        // do_action() passes '' when invoked without arguments. Treat that as
        // absent too, otherwise the real legacy callback skips its URL order ID.
        $raw = ($order_id === null || $order_id === '') ?
            ($legacy_id ?? (WC()->session ? WC()->session->get('order_id_sadadpsp') : null)) : $order_id;
        if (!is_scalar($raw) || !preg_match('/^[1-9][0-9]{0,14}$/D', (string) $raw)) return;
        $order = wc_get_order((int) $raw);
        if ($order && (is_array($order->get_meta(self::META, true)) || is_array($order->get_meta(self::TRANSFER_META, true)))) {
            wp_die('این سفارش باید از مسیر پرداخت و نتیجهٔ فروشگاه پیگیری شود.', '', ['response' => 403]);
        }
    }

    public function routes(): void {
        register_rest_route('nrh/v1', '/checkout', [
            'methods' => 'POST', 'callback' => [$this, 'checkout'],
            'permission_callback' => [$this, 'authenticated'],
        ]);
        register_rest_route('nrh/v1', '/orders/(?P<id>[1-9][0-9]{0,14})', [
            ['methods' => 'GET', 'callback' => [$this, 'order_status'], 'permission_callback' => [$this, 'authenticated']],
            ['methods' => 'POST', 'callback' => [$this, 'refresh_order'], 'permission_callback' => [$this, 'authenticated']],
        ]);
        register_rest_route('nrh/v1', '/sadad/callback', [
            'methods' => 'POST', 'callback' => [$this, 'callback'], 'permission_callback' => '__return_true',
        ]);
    }

    public function authenticated($request = null) {
        if (get_current_user_id() < 1) return $this->error('login_required', 'برای پرداخت وارد حساب شوید.', 401);
        // Require an explicit REST nonce even if another plugin authenticated the request.
        return $request && wp_verify_nonce($request->get_header('x-wp-nonce'), 'wp_rest') ? true :
            $this->error('invalid_nonce', 'نشست درخواست معتبر نیست.', 403);
    }

    public function no_cache($response, $server, $request) {
        $route = $request->get_route();
        if (in_array($route, ['/nrh/v1/checkout', '/nrh/v1/cart/merge', '/nrh/v1/capabilities', '/nrh/v1/sadad/callback'], true) || preg_match('#^/nrh/v1/orders/[1-9][0-9]{0,14}$#D', $route)) {
            $response->header('Cache-Control', 'private, no-store, max-age=0');
            $response->header('X-Robots-Tag', 'noindex');
            $response->header('Referrer-Policy', 'no-referrer');
            $response->header('X-Content-Type-Options', 'nosniff');
        }
        return $response;
    }

    private function error(string $code, string $message, int $status = 409): WP_Error {
        return new WP_Error($code, $message, ['status' => $status]);
    }

    /** MySQL connection locks release on disconnect and never steal an active lease. */
    public static function session_lock_key(string $identity): string {
        global $wpdb;
        // Named locks are server-wide, including other databases and multisite blogs.
        $site = (defined('DB_NAME') ? DB_NAME : '') . ':' . ($wpdb->prefix ?? '');
        return 'nrh_cart_' . substr(hash('sha256', $site . ':' . $identity), 0, 48);
    }

    /** Woo may silently fail an INSERT and still clear its dirty flag/cache it.
     * Read critical cart state back after invalidating the native session cache. */
    public static function persist_session($session): void {
        if (!is_callable([$session, 'get_session']) || !is_callable([$session, 'get'])) {
            throw new RuntimeException('Unsupported session storage.');
        }
        $session->save_data();
        $id = (string) $session->get_customer_id();
        wp_cache_delete(WC_Cache_Helper::get_cache_prefix(WC_SESSION_CACHE_GROUP) . $id, WC_SESSION_CACHE_GROUP);
        global $wpdb;
        // Intentionally bypass the object cache: a failed native INSERT may have
        // populated that cache with data that never reached the database.
        $value = $wpdb->get_var($wpdb->prepare('SELECT session_value FROM %i WHERE session_key = %s', $wpdb->prefix . 'woocommerce_sessions', $id));
        $stored = $value === null ? [] : maybe_unserialize($value);
        if (!is_array($stored) || !empty($wpdb->last_error)) throw new RuntimeException('Session storage unavailable.');
        foreach (['cart', 'cart_totals', 'applied_coupons', '_nrh_imported_guest_carts', 'store_api_draft_order'] as $key) {
            if (serialize(maybe_unserialize($stored[$key] ?? null)) !== serialize($session->get($key))) {
                throw new RuntimeException('Session could not be persisted.');
            }
        }
    }

    private function locked(int $user, callable $work) {
        global $wpdb;
        // Cart import, payment initiation and paid-cart cleanup must share the account lock.
        $key = self::session_lock_key((string) $user);
        if (!isset($this->locks[$key]) && '1' !== (string) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 0)', $key))) {
            return $this->error('payment_busy', 'درخواست قبلی در حال بررسی است. کمی بعد وضعیت را بررسی کنید.');
        }
        $this->locks[$key] = true;
        // Keep the lock through Woo's shutdown session writes as well.
        wp_cache_delete($user, 'user_meta');
        wp_cache_delete(WC_Cache_Helper::get_cache_prefix(WC_SESSION_CACHE_GROUP) . $user, WC_SESSION_CACHE_GROUP);
        return $work();
    }

    public function release(): void {
        global $wpdb;
        foreach (array_keys($this->locks) as $key) {
            $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $key));
        }
        $this->locks = [];
    }

    private function attempts(int $user): array {
        $rows = get_user_meta($user, self::ATTEMPTS, true);
        return is_array($rows) ? $rows : [];
    }

    private function save_attempts(int $user, array $rows): void {
        update_user_meta($user, self::ATTEMPTS, $rows);
        if (get_user_meta($user, self::ATTEMPTS, true) !== $rows) {
            throw new RuntimeException('Payment state could not be persisted.');
        }
    }

    private function save_payment($order, array $payment): void {
        $order->update_meta_data(self::META, $payment);
        $order->save();
        // Read through Woo's datastore (including HPOS), bypassing metadata cache.
        $order->read_meta_data(true);
        if ($order->get_meta(self::META, true) !== $payment) {
            throw new RuntimeException('Order payment state could not be persisted.');
        }
    }

    public function checkout(WP_REST_Request $request) {
        $input = $request->get_json_params();
        if (strlen($request->get_body()) > 16384 || !is_array($input) ||
            array_diff(array_keys($input), ['attempt_id', 'cart_hash', 'expected_total', 'billing_address', 'shipping_address', 'payment_method', 'customer_note']) ||
            !is_string($input['attempt_id'] ?? null) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/D', $input['attempt_id']) ||
            !is_string($input['cart_hash'] ?? null) || !preg_match('/^[0-9a-f]{64}$/D', $input['cart_hash']) ||
            !is_string($input['expected_total'] ?? null) || !preg_match('/^[0-9]{1,18}$/D', $input['expected_total']) ||
            !is_array($input['billing_address'] ?? null) || !is_array($input['shipping_address'] ?? null) ||
            !in_array($input['payment_method'] ?? 'melli_pay', ['melli_pay', 'bacs'], true) ||
            !is_string($input['customer_note'] ?? '') || strlen($input['customer_note'] ?? '') > 4000 || mb_strlen($input['customer_note'] ?? '') > 1000) {
            return $this->error('invalid_input', 'اطلاعات درخواست معتبر نیست.', 400);
        }
        $input['payment_method'] = $input['payment_method'] ?? 'melli_pay';
        $input['customer_note'] = sanitize_textarea_field($input['customer_note'] ?? '');
        $user = get_current_user_id();
        $permission = $this->authenticated($request);
        if (is_wp_error($permission)) return $permission;
        if (!wp_verify_nonce($request->get_header('nonce'), 'wc_store_api')) {
            return $this->error('invalid_store_nonce', 'نشست تسویه معتبر نیست. سبد را تازه‌سازی کنید.', 403);
        }
        $token = $request->get_header('cart-token');
        if ($token) {
            return $this->error('cart_transport_unsupported', 'تسویه حساب مشتری باید با نشست معتبر وردپرس انجام شود.', 400);
        }
        return $this->locked($user, function () use ($input, $request, $user) {
            try {
                $this->frontend();
                $rows = $this->attempts($user);
                $id = $input['attempt_id'];
                if (isset($rows[$id])) {
                    if ($rows[$id]['hash'] !== $input['cart_hash'] || $rows[$id]['total'] !== $input['expected_total'] ||
                        ($rows[$id]['method'] ?? 'melli_pay') !== $input['payment_method'] ||
                        ($rows[$id]['note_hash'] ?? hash('sha256', '')) !== hash('sha256', $input['customer_note'])) {
                        return $this->error('attempt_changed', 'این شناسه برای سبد دیگری استفاده شده است.');
                    }
                    return $this->resume($rows[$id], $user);
                }
                foreach ($rows as $row) {
                    // A fresh UUID cannot bypass an unresolved payment for the same cart.
                    if ($row['state'] !== 'rejected') {
                        $previous = $row['order_id'] ? wc_get_order($row['order_id']) : false;
                        if (($row['method'] ?? '') === 'bacs' && $row['state'] === 'placed' && $previous && $row['hash'] !== $input['cart_hash']) continue;
                        if (!$previous || !$previous->is_paid()) {
                            if (($row['method'] ?? 'melli_pay') !== $input['payment_method'] && ($row['method'] ?? '') !== 'bacs') {
                                return $this->error('payment_pending', 'درخواست پرداخت قبلی هنوز تعیین تکلیف نشده است. ابتدا وضعیت همان سفارش را بررسی کنید.');
                            }
                            if ($row['hash'] !== $input['cart_hash'] && $previous) {
                                return new WP_REST_Response(['order_id' => $previous->get_id(), 'redirect_url' => $this->frontend() . '/checkout/result?order=' . $previous->get_id()]);
                            }
                            return $this->resume($row, $user);
                        }
                    }
                }
                // Bounded retention; unresolved attempts are never silently evicted.
                $rows = array_filter($rows, static fn($row) => $row['created'] > time() - 7 * DAY_IN_SECONDS || $row['state'] === 'processing');
                if (count($rows) >= 50) {
                    return $this->error('payment_rate_limited', 'تعداد درخواست‌های پرداخت زیاد است. با پشتیبانی تماس بگیرید.', 429);
                }
                $rows[$id] = ['hash' => $input['cart_hash'], 'total' => $input['expected_total'], 'method' => $input['payment_method'],
                    'note_hash' => hash('sha256', $input['customer_note']), 'created' => time(), 'state' => 'processing', 'order_id' => 0];
                $this->save_attempts($user, $rows);
                $this->context = ['user' => $user, 'attempt' => $id, 'rows' => $rows, 'started' => false];
                $checkout = new WP_REST_Request('POST', '/wc/store/v1/checkout');
                foreach (['x-wp-nonce', 'nonce'] as $header) {
                    if ($request->get_header($header)) {
                        $checkout->set_header($header, $request->get_header($header));
                    }
                }
                $checkout->set_body_params([
                    'billing_address' => $input['billing_address'], 'shipping_address' => $input['shipping_address'],
                    'expected_total' => $input['expected_total'], 'payment_method' => $input['payment_method'], 'customer_note' => $input['customer_note'],
                    'payment_data' => [],
                ]);
                // Use WooCommerce's stock, coupon, shipping, address and order validation.
                $response = rest_do_request($checkout);
                $rows = $this->attempts($user);
                if (!empty($rows[$id]['order_id'])) {
                    return $this->resume($rows[$id], $user);
                }
                if (!$this->context['started']) {
                    unset($rows[$id]); // No bank request was made; correcting validation is safe.
                    $this->save_attempts($user, $rows);
                }
                return $this->error('checkout_rejected', 'ثبت تسویه ممکن نشد. آدرس، ارسال و تنظیمات ووکامرس را بررسی کنید.', $response->get_status() >= 500 ? 502 : 409);
            } catch (Throwable $error) {
                if ($this->context && !$this->context['started']) {
                    try {
                        $rows = $this->attempts($user);
                        unset($rows[$input['attempt_id']]);
                        $this->save_attempts($user, $rows);
                    } catch (Throwable $storage_error) {
                        // Keep failing closed if persistence itself is unavailable.
                    }
                }
                // Never return upstream PHP paths, merchant credentials, tokens or stack traces.
                return $this->error('checkout_unavailable', 'ثبت تسویه ممکن نشد. وضعیت سفارش را پیش از تلاش دوباره بررسی کنید.', 502);
            } finally {
                $this->context = null;
            }
        });
    }

    private function resume(array $row, int $user) {
        $order = !empty($row['order_id']) ? wc_get_order($row['order_id']) : false;
        if (!$order || (int) $order->get_customer_id() !== $user) {
            return $this->error('payment_unknown', 'نتیجه درخواست قبلی مشخص نیست؛ برای جلوگیری از پرداخت تکراری با پشتیبانی تماس بگیرید.');
        }
        $payment = $order->get_meta(self::META, true);
        if ($order->is_paid()) {
            return new WP_REST_Response(['order_id' => $order->get_id(), 'redirect_url' => $this->frontend() . '/checkout/result?order=' . $order->get_id()]);
        }
        if (is_array($payment) && $payment['state'] === 'awaiting' && !empty($payment['token'])) {
            return new WP_REST_Response(['order_id' => $order->get_id(), 'redirect_url' => self::BANK . 'Purchase?Token=' . rawurlencode($payment['token'])]);
        }
        return new WP_REST_Response(['order_id' => $order->get_id(), 'redirect_url' => $this->frontend() . '/checkout/result?order=' . $order->get_id()]);
    }

    public function process_payment($context, &$result): void {
        if (!$this->context || !in_array($context->payment_method, ['melli_pay', 'bacs'], true)) {
            return;
        }
        $order = $context->order;
        $user = $this->context['user'];
        if ((int) $order->get_customer_id() !== $user || $order->is_paid()) {
            throw new RuntimeException('Invalid order ownership or state.');
        }
        $decimals = wc_get_price_decimals();
        $total = explode('.', (string) $order->get_total());
        $fraction = $total[1] ?? '';
        if (trim(substr($fraction, $decimals), '0') !== '') throw new RuntimeException('Unsupported total precision.');
        $expected = ltrim($total[0] . str_pad(substr($fraction, 0, $decimals), $decimals, '0'), '0') ?: '0';
        if ($expected !== $this->context['rows'][$this->context['attempt']]['total']) {
            throw new RuntimeException('Order total changed during checkout.');
        }
        if ($context->payment_method === 'bacs') {
            $this->process_transfer($order, $result);
            return;
        }
        $settings = $this->settings();
        if ((wp_parse_url(rest_url('nrh/v1/sadad/callback'))['scheme'] ?? '') !== 'https') throw new RuntimeException('The bank callback requires HTTPS.');
        $amount = self::rial_amount((string) $order->get_total(), $order->get_currency());
        $callback_key = bin2hex(random_bytes(32));
        $payment = [
            'attempt' => $this->context['attempt'], 'state' => 'requesting',
            'bank_id' => (string) random_int(100000000000, 999999999999),
            'amount' => $amount, 'currency' => $order->get_currency(),
            'callback_hash' => hash('sha256', $callback_key), 'token' => '', 'checked_at' => 0,
        ];
        $signature = $this->sign($settings['terminal_id'] . ';' . $payment['bank_id'] . ';' . $amount, $settings['terminal_key']);
        $this->save_payment($order, $payment);
        $rows = $this->context['rows'];
        $rows[$this->context['attempt']]['order_id'] = $order->get_id();
        $this->save_attempts($user, $rows);
        $this->context['started'] = true;
        $reply = $this->bank('Request/PaymentRequest', [
            'MerchantID' => $settings['merchant_id'], 'TerminalId' => $settings['terminal_id'],
            'Amount' => $amount, 'OrderId' => $payment['bank_id'], 'LocalDateTime' => wp_date('YmdHis'),
            'ReturnUrl' => add_query_arg(['order' => $order->get_id(), 'key' => $callback_key], rest_url('nrh/v1/sadad/callback')),
            'SignData' => $signature,
        ]);
        if (is_wp_error($reply)) {
            $payment['state'] = 'request_unknown';
        } elseif ((string) $reply['ResCode'] !== '0') {
            $payment['state'] = 'rejected';
            $rows[$this->context['attempt']]['state'] = 'rejected';
            $this->save_attempts($user, $rows);
        } elseif (is_string($reply['Token'] ?? null) && preg_match('/^[a-zA-Z0-9+\/_=-]{8,512}$/D', $reply['Token'])) {
            $payment['state'] = 'awaiting';
            $payment['token'] = $reply['Token'];
            $rows[$this->context['attempt']]['state'] = 'ready';
            $this->save_attempts($user, $rows);
        } else {
            $payment['state'] = 'request_unknown';
        }
        $this->save_payment($order, $payment);
        if ($payment['state'] !== 'awaiting') {
            throw new RuntimeException('Bank initiation failed or has an unknown outcome.');
        }
        $result->set_status('success'); // Initiation succeeded; this does NOT mark the order paid.
        $result->set_redirect_url(self::BANK . 'Purchase?Token=' . rawurlencode($payment['token']));
    }

    private function process_transfer($order, $result): void {
        $gateways = WC()->payment_gateways()->get_available_payment_gateways();
        $gateway = $gateways['bacs'] ?? null;
        if (!$gateway || !is_callable([$gateway, 'process_payment'])) throw new RuntimeException('Bank transfer unavailable.');
        // Persist ownership/idempotency before the native gateway's stock, email
        // and cart effects. An uncertain response must never create another order.
        $marker = ['attempt' => $this->context['attempt'], 'state' => 'transfer_processing'];
        $order->update_meta_data(self::TRANSFER_META, $marker);
        $order->save();
        $order->read_meta_data(true);
        if ($order->get_meta(self::TRANSFER_META, true) !== $marker) throw new RuntimeException('Order storage unavailable.');
        $rows = $this->context['rows'];
        $rows[$this->context['attempt']]['order_id'] = $order->get_id();
        $this->save_attempts($this->context['user'], $rows);
        $this->context['started'] = true;
        $native = $gateway->process_payment($order->get_id());
        if (!is_array($native) || ($native['result'] ?? '') !== 'success') throw new RuntimeException('Native bank transfer failed.');
        self::persist_session(WC()->session);
        $marker['state'] = 'transfer_pending';
        $order->update_meta_data(self::TRANSFER_META, $marker);
        $order->save();
        $order->read_meta_data(true);
        if ($order->get_meta(self::TRANSFER_META, true) !== $marker) throw new RuntimeException('Order storage unavailable.');
        $rows[$this->context['attempt']]['state'] = 'placed';
        $this->save_attempts($this->context['user'], $rows);
        $result->set_status('success');
        $result->set_redirect_url($this->frontend() . '/checkout/result?order=' . $order->get_id());
    }

    /** Only curated presentation data; never expose gateway settings or keys. */
    public static function cart_details(): array {
        $details = ['version' => 2, 'methods' => [], 'cashback' => null];
        if (is_callable([WC(), 'payment_gateways'])) {
            foreach (WC()->payment_gateways()->get_available_payment_gateways() as $id => $gateway) {
                if (in_array($id, ['melli_pay', 'bacs'], true)) $details['methods'][] = [
                    'id' => $id, 'title' => mb_strcut(html_entity_decode(wp_strip_all_tags($gateway->get_title()), ENT_QUOTES | ENT_HTML5, 'UTF-8'), 0, 150, 'UTF-8'),
                    'description' => mb_strcut(html_entity_decode(wp_strip_all_tags($gateway->get_description()), ENT_QUOTES | ENT_HTML5, 'UTF-8'), 0, 1500, 'UTF-8'),
                ];
            }
        }
        try {
            if (function_exists('woo_wallet') && is_callable([woo_wallet()->cashback ?? null, 'calculate_cashback']) &&
                (!function_exists('is_wallet_rechargeable_cart') || !is_wallet_rechargeable_cart()) &&
                (!function_exists('is_wallet_account_locked') || !is_wallet_account_locked()) &&
                apply_filters('display_cashback_notice_at_woocommerce_page', true)) {
                $amount = woo_wallet()->cashback->calculate_cashback();
                $minor = str_replace('.', '', wc_format_decimal($amount, wc_get_price_decimals()));
                if (preg_match('/^[0-9]{1,18}$/D', $minor) && (float) $amount > 0) $details['cashback'] = $minor;
            }
        } catch (Throwable $error) { /* Optional rewards must not break checkout. */ }
        return $details;
    }

    private function settings(bool $require_enabled = true): array {
        $settings = get_option('woocommerce_melli_pay_settings', []);
        if ($require_enabled && ($settings['enabled'] ?? '') !== 'yes') {
            throw new RuntimeException('Sadad gateway is disabled.');
        }
        foreach (['merchant_id', 'terminal_id', 'terminal_key'] as $key) {
            if (!is_string($settings[$key] ?? null) || $settings[$key] === '') {
                throw new RuntimeException('Missing gateway settings.');
            }
        }
        return $settings;
    }

    private function sign(string $data, string $encoded_key): string {
        $key = base64_decode($encoded_key, true);
        if (!is_string($key) || strlen($key) !== 24 || !function_exists('openssl_encrypt')) {
            throw new RuntimeException('Invalid gateway encryption configuration.');
        }
        $signature = openssl_encrypt($data, 'des-ede3', $key, 0);
        if (!is_string($signature)) {
            throw new RuntimeException('Gateway signing failed.');
        }
        return $signature;
    }

    private function bank(string $endpoint, array $body) {
        $response = wp_remote_post(self::BANK . 'api/v0/' . $endpoint, [
            'timeout' => 12, 'redirection' => 0, 'sslverify' => true, 'limit_response_size' => 16384,
            'headers' => ['Content-Type' => 'application/json; charset=utf-8'],
            'body' => wp_json_encode($body), 'data_format' => 'body',
        ]);
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            return $this->error('bank_unavailable', 'ارتباط با بانک ممکن نشد.', 502);
        }
        $reply = json_decode(wp_remote_retrieve_body($response), true, 32, JSON_BIGINT_AS_STRING);
        if (!is_array($reply) || !isset($reply['ResCode']) || !is_scalar($reply['ResCode']) ||
            !preg_match('/^-?[0-9]{1,6}$/D', (string) $reply['ResCode'])) {
            return $this->error('invalid_bank_response', 'پاسخ بانک معتبر نیست.', 502);
        }
        return $reply;
    }

    /** Exact decimal conversion; never truncate fractions or calculate money with floats. */
    public static function rial_amount(string $total, string $currency): int {
        $factors = ['irr' => 1, 'rial' => 1, 'irt' => 10, 'toman' => 10, 'irhr' => 1000, 'irht' => 10000];
        $factor = $factors[strtolower($currency)] ?? 0;
        if (PHP_INT_SIZE < 8 || !$factor || !preg_match('/^([0-9]{1,12})(?:\.([0-9]{1,4}))?$/D', $total, $match)) {
            throw new RuntimeException('Unsupported currency or amount.');
        }
        $fraction = $match[2] ?? '';
        $scale = 10 ** strlen($fraction);
        $minor = (int) ($match[1] . $fraction);
        $scaled = $minor * $factor;
        if (!is_int($scaled) || $scaled <= 0 || $scaled % $scale !== 0) {
            throw new RuntimeException('Amount cannot be represented as whole rials.');
        }
        return intdiv($scaled, $scale);
    }

    private function frontend(): string {
        $url = defined('NRH_HEADLESS_FRONTEND_URL') ? NRH_HEADLESS_FRONTEND_URL : '';
        $parts = is_string($url) ? wp_parse_url($url) : false;
        $local = $parts && in_array($parts['host'] ?? '', ['localhost', '127.0.0.1', '[::1]'], true) &&
            function_exists('wp_get_environment_type') && wp_get_environment_type() !== 'production';
        if (!$parts || empty($parts['host']) || isset($parts['user']) || isset($parts['pass']) ||
            isset($parts['query']) || isset($parts['fragment']) || !in_array($parts['path'] ?? '', ['', '/'], true) ||
            (($parts['scheme'] ?? '') !== 'https' && !(($parts['scheme'] ?? '') === 'http' && $local))) {
            throw new RuntimeException('Configure a fixed HTTPS frontend origin.');
        }
        return rtrim($url, '/');
    }

    private function owned_order(int $id) {
        $order = wc_get_order($id);
        return $order && (int) $order->get_customer_id() === get_current_user_id() &&
            (($order->get_payment_method() === 'melli_pay' && is_array($order->get_meta(self::META, true))) ||
                ($order->get_payment_method() === 'bacs' && is_array($order->get_meta(self::TRANSFER_META, true)))) ? $order : false;
    }

    private function status($order): WP_REST_Response {
        if ($order->get_payment_method() === 'bacs') {
            $marker = $order->get_meta(self::TRANSFER_META, true);
            $data = ['order_id' => $order->get_id(), 'status' => $order->get_status(), 'paid' => $order->is_paid(),
                'payment_state' => $order->is_paid() ? 'paid' : $marker['state'], 'reference' => '', 'payment_method' => 'bacs', 'bank_transfer' => null];
            if (!$order->is_paid() && $order->get_status() === 'on-hold' && $marker['state'] === 'transfer_pending') {
                $settings = get_option('woocommerce_bacs_settings', []);
                $accounts = apply_filters('woocommerce_bacs_accounts', get_option('woocommerce_bacs_accounts', []), $order->get_id());
                $safe_accounts = [];
                foreach (array_slice(is_array($accounts) ? $accounts : [], 0, 5) as $account) {
                    if (!is_array($account)) continue;
                    $safe = [];
                    foreach (['account_name', 'account_number', 'bank_name', 'sort_code', 'iban', 'bic'] as $key) {
                        $safe[$key] = mb_strcut(sanitize_text_field(is_scalar($account[$key] ?? '') ? (string) ($account[$key] ?? '') : ''), 0, 100, 'UTF-8');
                    }
                    $safe_accounts[] = $safe;
                }
                $data['bank_transfer'] = ['instructions' => mb_strcut(wp_strip_all_tags((string) ($settings['instructions'] ?? '')), 0, 3000, 'UTF-8'), 'accounts' => $safe_accounts];
            }
            return new WP_REST_Response($data);
        }
        $payment = $order->get_meta(self::META, true);
        return new WP_REST_Response([
            'order_id' => $order->get_id(), 'status' => $order->get_status(), 'paid' => $order->is_paid(),
            'payment_state' => $payment['state'],
            'reference' => $order->is_paid() ? (string) ($payment['reference'] ?? '') : '',
        ]);
    }

    public function order_status(WP_REST_Request $request) {
        $order = $this->owned_order((int) $request['id']);
        return $order ? $this->status($order) : $this->error('order_not_found', 'سفارش پیدا نشد.', 404);
    }

    public function refresh_order(WP_REST_Request $request) {
        return $this->locked(get_current_user_id(), function () use ($request) {
            $order = $this->owned_order((int) $request['id']);
            if (!$order) {
                return $this->error('order_not_found', 'سفارش پیدا نشد.', 404);
            }
            $payment = $order->get_meta(self::META, true);
            if ($order->get_payment_method() === 'melli_pay' && !$order->is_paid() && in_array($payment['state'], ['awaiting', 'verify_pending', 'verified'], true) &&
                $payment['checked_at'] <= time() - 15) {
                $this->verify($order, $payment);
            }
            if ($order->is_paid() && $order->get_payment_method() === 'melli_pay') {
                wc_load_cart();
                // Do not clear a new or modified cart after an older order's callback.
                if ($order->has_cart_hash(WC()->cart->get_cart_hash())) {
                    WC()->cart->empty_cart();
                    try {
                        self::persist_session(WC()->session);
                    } catch (Throwable $error) {
                        return $this->error('cart_cleanup_unavailable', 'پرداخت تأیید شده است؛ ذخیرهٔ سبد خالی کامل نشد. دوباره وضعیت سفارش را بررسی کنید.', 503);
                    }
                }
            }
            return $this->status($order);
        });
    }

    public function callback(WP_REST_Request $request) {
        $query = $request->get_query_params();
        $body = $request->get_body_params();
        if (strlen($request->get_body()) > 8192 || !is_scalar($query['order'] ?? null) ||
            !preg_match('/^[1-9][0-9]{0,14}$/D', (string) $query['order'])) {
            return $this->error('invalid_callback', 'پاسخ پرداخت معتبر نیست.', 400);
        }
        $order = wc_get_order((int) $query['order']);
        $payment = $order ? $order->get_meta(self::META, true) : null;
        if (!$order || $order->get_payment_method() !== 'melli_pay' || !is_array($payment) ||
            !is_string($query['key'] ?? null) || !preg_match('/^[0-9a-f]{64}$/D', $query['key']) || !hash_equals($payment['callback_hash'], hash('sha256', $query['key'])) ||
            !is_string($body['token'] ?? null) || !$payment['token'] || !hash_equals($payment['token'], $body['token']) ||
            !is_scalar($body['OrderId'] ?? null) || (string) $body['OrderId'] !== $payment['bank_id']) {
            return $this->error('invalid_callback', 'پاسخ پرداخت معتبر نیست.', 400);
        }
        return $this->locked((int) $order->get_customer_id(), function () use ($order) {
            // Reload after acquiring the lock; a duplicate callback may already have completed.
            $order = wc_get_order($order->get_id());
            $this->verify($order, $order->get_meta(self::META, true));
            try {
                return new WP_REST_Response(null, 303, ['Location' => $this->frontend() . '/checkout/result?order=' . $order->get_id()]);
            } catch (Throwable $error) {
                return $this->error('frontend_unavailable', 'پرداخت بررسی شد؛ وضعیت سفارش را از حساب خود پیگیری کنید.', 503);
            }
        });
    }

    private function verify($order, array $payment): void {
        if ($order->is_paid()) {
            return;
        }
        if ($payment['state'] !== 'verified' && $payment['checked_at'] > time() - 15) return;
        try {
            if (self::rial_amount((string) $order->get_total(), $order->get_currency()) !== $payment['amount'] ||
                $order->get_currency() !== $payment['currency']) {
                throw new RuntimeException('Order amount changed.');
            }
            if ($payment['state'] !== 'verified') {
                $payment['checked_at'] = time();
                $reply = $this->bank('Advice/Verify', [
                    'Token' => $payment['token'], 'SignData' => $this->sign($payment['token'], $this->settings(false)['terminal_key']),
                ]);
                if (is_wp_error($reply) || (string) $reply['ResCode'] !== '0' ||
                    (string) ($reply['OrderId'] ?? '') !== $payment['bank_id'] ||
                    (isset($reply['Amount']) && (string) $reply['Amount'] !== (string) $payment['amount']) ||
                    !preg_match('/^[0-9]{1,40}$/D', (string) ($reply['SystemTraceNo'] ?? '')) ||
                    !preg_match('/^[0-9]{1,40}$/D', (string) ($reply['RetrivalRefNo'] ?? ''))) {
                    // An ambiguous/expired verification never becomes a paid or failed order.
                    throw new RuntimeException('Bank verification is not conclusive.');
                }
                $payment['state'] = 'verified';
                $payment['trace'] = (string) $reply['SystemTraceNo'];
                $payment['reference'] = (string) $reply['RetrivalRefNo'];
                $this->save_payment($order, $payment); // Persist evidence before payment_complete side effects.
            }
            $order->payment_complete($payment['trace']);
            if (!$order->is_paid()) {
                throw new RuntimeException('Order completion needs reconciliation.');
            }
            $payment['state'] = 'paid';
            $this->save_payment($order, $payment);
        } catch (Throwable $error) {
            if ($payment['state'] !== 'verified') {
                $payment['state'] = 'verify_pending';
            }
            $this->save_payment($order, $payment);
        }
    }
}
