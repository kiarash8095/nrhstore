<?php
defined('ABSPATH') || exit;

/** Transfer a bearer guest cart to the authenticated user's native Woo session. */
final class NRH_Cart_Session {
    private const IMPORTS = '_nrh_imported_guest_carts';
    private NRH_Headless_Checkout $checkout;
    private array $locks = [];

    public function __construct(NRH_Headless_Checkout $checkout) {
        $this->checkout = $checkout;
    }

    public function register(): void {
        add_action('rest_api_init', [$this, 'routes']);
        add_action('shutdown', [$this, 'release'], PHP_INT_MAX);
    }

    public function release(): void {
        global $wpdb;
        foreach (array_reverse($this->locks) as $key) $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $key));
        $this->locks = [];
    }

    public function routes(): void {
        register_rest_route('nrh/v1', '/cart/merge', [
            'methods' => 'POST', 'callback' => [$this, 'merge'],
            'permission_callback' => [$this->checkout, 'authenticated'],
        ]);
    }

    private function error(string $code, string $message, int $status = 409): WP_Error {
        return new WP_Error($code, $message, ['status' => $status]);
    }

    private function clear_cache(string $id): void {
        wp_cache_delete(WC_Cache_Helper::get_cache_prefix(WC_SESSION_CACHE_GROUP) . $id, WC_SESSION_CACHE_GROUP);
    }

    private function fingerprint(array $cart): string {
        $lines = [];
        foreach ($cart as $key => $item) {
            $lines[$key] = [(int) ($item['product_id'] ?? 0), (int) ($item['variation_id'] ?? 0), (float) ($item['quantity'] ?? 0)];
        }
        ksort($lines, SORT_STRING);
        return hash('sha256', serialize($lines));
    }

    private function retire_guest($session, string $guest): void {
        $session->delete_session($guest);
        $this->clear_cache($guest);
        if ($session->get_session($guest, []) !== []) {
            throw new RuntimeException('Guest cart retirement could not be persisted.');
        }
    }

    private function combine(array $account, array $guest) {
        $combined = $account;
        foreach ($guest as $key => $item) {
            if (!is_array($item) || !is_numeric($item['quantity'] ?? null)) return $this->error('invalid_guest_cart', 'تعداد کالاهای سبد مهمان معتبر نیست.', 400);
            $quantity = (float) $item['quantity'];
            if (!is_finite($quantity) || $quantity <= 0) return $this->error('invalid_guest_cart', 'تعداد کالاهای سبد مهمان معتبر نیست.', 400);
            if (isset($account[$key])) {
                if (!is_array($account[$key]) || !is_numeric($account[$key]['quantity'] ?? null)) return $this->error('invalid_account_cart', 'سبد حساب معتبر نیست.');
                $quantity += (float) $account[$key]['quantity'];
            }
            if (!is_finite($quantity) || $quantity <= 0) return $this->error('invalid_guest_cart', 'تعداد کالاهای سبد مهمان معتبر نیست.', 400);
            $item['quantity'] = wc_stock_amount($quantity);
            $combined[$key] = $item;
        }
        if (count($combined) > 200) return $this->error('cart_merge_limit', 'تعداد ردیف‌های سبد بیش از حد مجاز است.');
        $limits = new \Automattic\WooCommerce\StoreApi\Utilities\QuantityLimits();
        $reserved = new \Automattic\WooCommerce\Checkout\Helpers\ReserveStock();
        $stock = [];
        foreach ($combined as $key => $item) {
            $product = wc_get_product(!empty($item['variation_id']) ? $item['variation_id'] : ($item['product_id'] ?? 0));
            if (!$product || !$product->exists() || !$product->is_purchasable() || !$product->is_in_stock()) return $this->error('cart_merge_product_changed', 'یکی از کالاها قابل خرید نیست. سبدها محفوظ‌اند؛ کالا را بررسی کنید.');
            if (isset($item['data_hash']) && !hash_equals((string) $item['data_hash'], wc_get_cart_item_data_hash($product))) return $this->error('cart_merge_product_changed', 'مشخصات یکی از کالاها تغییر کرده است. سبدها را بررسی کنید.');
            $valid = $limits->validate_cart_item_quantity($item['quantity'], array_merge($item, ['data' => $product, 'key' => $key]));
            if (is_wp_error($valid)) return $this->error('cart_merge_quantity_conflict', 'مجموع تعداد یکی از کالاها با موجودی یا محدودیت خرید سازگار نیست. سبدها محفوظ‌اند؛ تعداد را بررسی کنید.');
            $id = $product->get_stock_managed_by_id();
            $stock[$id] = ($stock[$id] ?? 0) + $item['quantity'];
        }
        foreach ($stock as $id => $quantity) {
            $product = wc_get_product($id);
            if ($product && $product->managing_stock() && !$product->backorders_allowed()) {
                $available = (float) $product->get_stock_quantity() - $reserved->get_reserved_stock($product, (int) WC()->session->get('store_api_draft_order', 0));
                if ($quantity > $available) return $this->error('cart_merge_quantity_conflict', 'موجودی برای مجموع کالاهای دو سبد کافی نیست. سبدها محفوظ‌اند؛ تعداد را بررسی کنید.');
            }
        }
        return $combined;
    }

    public function merge(WP_REST_Request $request) {
        $permission = $this->checkout->authenticated($request);
        if (is_wp_error($permission)) return $permission;
        $input = $request->get_json_params();
        if (strlen($request->get_body()) > 4096 || !is_array($input) ||
            count($input) !== 2 || array_diff(array_keys($input), ['guest_token', 'merge_policy']) ||
            ($input['merge_policy'] ?? null) !== 'sum-v1' || !is_string($input['guest_token'] ?? null) ||
            strlen($input['guest_token']) > 3800 || $request->get_header('cart-token')) {
            return $this->error('invalid_input', 'اطلاعات انتقال سبد معتبر نیست.', 400);
        }
        $tokens = \Automattic\WooCommerce\StoreApi\Utilities\CartTokenUtils::class;
        try {
            if (!class_exists($tokens) || !$tokens::validate_cart_token($input['guest_token'])) {
                return $this->error('invalid_guest_cart', 'نشست سبد مهمان معتبر نیست.', 403);
            }
            $payload = $tokens::get_cart_token_payload($input['guest_token']);
            $guest = $payload['user_id'] ?? null;
            // Numeric identities belong to accounts. Never import another customer's cart.
            if (!is_string($guest) || !preg_match('/^(?:t_[a-zA-Z0-9_-]{16,126}|[a-f0-9]{32})$/D', $guest) || ctype_digit($guest)) {
                return $this->error('invalid_guest_cart', 'فقط سبد مهمان قابل انتقال است.', 403);
            }
        } catch (Throwable $error) {
            return $this->error('invalid_guest_cart', 'نشست سبد مهمان معتبر نیست.', 403);
        }

        global $wpdb;
        $user = (string) get_current_user_id();
        $locks = array_map([NRH_Headless_Checkout::class, 'session_lock_key'], [$guest, $user]);
        sort($locks, SORT_STRING);
        if ($this->locks !== [] && $this->locks !== $locks) return $this->error('cart_busy', 'نشست دیگری در همین درخواست فعال است.');
        $acquired = [];
        try {
            foreach ($locks as $key) {
                if (in_array($key, $this->locks, true)) continue;
                if ('1' !== (string) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 0)', $key))) {
                    return $this->error('cart_busy', 'سبد در حال به‌روزرسانی است. کمی بعد دوباره بررسی کنید.');
                }
                $acquired[] = $key;
            }
            $this->locks = $locks;
            WC()->initialize_session();
            $session = WC()->session;
            if (!$session instanceof WC_Session_Handler || !is_callable([$session, 'init_session_cookie'])) {
                return $this->error('unsupported_cart_session', 'نشست استاندارد سبد فروشگاه فعال نیست.', 503);
            }
            // Refresh after acquiring the locks; token sessions write to the same table
            // without updating the classic Woo session cache.
            $this->clear_cache($guest);
            $this->clear_cache($user);
            $session->init_session_cookie();
            if ((string) $session->get_customer_id() !== $user) {
                return $this->error('invalid_cart_identity', 'نشست سبد با حساب مشتری یکسان نیست.', 403);
            }
            $imports = $session->get(self::IMPORTS, []);
            $imports = is_array($imports) ? array_filter($imports, static fn($record) =>
                (is_int($record) && $record > time()) ||
                (is_array($record) && is_int($record['until'] ?? null) && $record['until'] > time() &&
                    in_array($record['state'] ?? '', ['pending', 'complete'], true) &&
                    is_string($record['hash'] ?? null) && preg_match('/^[a-f0-9]{64}$/D', $record['hash']))
            ) : [];
            $source = hash('sha256', $guest);
            if (isset($imports[$source])) {
                if (is_array($imports[$source]) && $imports[$source]['state'] === 'pending') {
                    // A hook may have persisted a partial transfer before throwing.
                    // Never add quantities twice or retire the only complete source.
                    $cart = $session->get('cart', []);
                    if (!is_array($cart) || !hash_equals($imports[$source]['hash'], $this->fingerprint($cart))) {
                        return $this->error('cart_sync_conflict', 'سبد هنگام انتقال تغییر کرده است. سبد مهمان محفوظ است؛ برای بررسی با پشتیبانی تماس بگیرید.');
                    }
                    $imports[$source]['state'] = 'complete';
                    $session->set(self::IMPORTS, $imports);
                    NRH_Headless_Checkout::persist_session($session);
                }
                // A lost response must not reapply old quantities after later edits.
                $this->retire_guest($session, $guest);
                return new WP_REST_Response(['merged' => true]);
            }
            if (count($imports) >= 50) {
                return $this->error('cart_sync_limited', 'تعداد انتقال‌های سبد زیاد است. کمی بعد دوباره تلاش کنید.', 429);
            }
            $data = $session->get_session($guest, []);
            // WC_Session serializes each value inside the persisted session array.
            $items = maybe_unserialize($data['cart'] ?? []);
            if (!is_array($items) || count($items) > 200) {
                return $this->error('invalid_guest_cart', 'سبد مهمان قابل انتقال نیست.', 400);
            }
            $controller = new \Automattic\WooCommerce\StoreApi\Utilities\CartController();
            $controller->load_cart();
            $cart_session = new WC_Cart_Session(WC()->cart);
            $cart_session->get_cart_from_session();
            $account = $cart_session->get_cart_for_session();
            $combined = $this->combine($account, $items);
            if (is_wp_error($combined)) return $combined;
            // Quantity and replay evidence must be in the same session snapshot
            // before Woo hooks can persist it, including on a failed calculation.
            $imports[$source] = ['until' => max(time() + DAY_IN_SECONDS, (int) ($payload['exp'] ?? 0)),
                'state' => 'pending', 'hash' => $this->fingerprint($combined)];
            $session->set('cart', $combined);
            $session->set(self::IMPORTS, $imports);
            $session->set('cart_totals', null);
            $coupons = array_merge((array) $session->get('applied_coupons', []), (array) maybe_unserialize($data['applied_coupons'] ?? []));
            $session->set('applied_coupons', array_values(array_unique(array_filter($coupons, 'is_string'))));
            // Rehydrate through Woo so current products, variations, extensions,
            // pricing, stock rules, coupons and totals remain WooCommerce's responsibility.
            // Customer/address data and draft orders are deliberately not copied.
            $cart_session->get_cart_from_session();
            WC()->cart->calculate_totals();
            $cart_session->set_session();
            if (!hash_equals($imports[$source]['hash'], $this->fingerprint((array) $session->get('cart', [])))) {
                throw new RuntimeException('A cart extension changed the transferred quantities.');
            }
            NRH_Headless_Checkout::persist_session($session);
            $this->clear_cache($user);
            $persisted = $session->get_session($user, []);
            $persisted_imports = maybe_unserialize($persisted[self::IMPORTS] ?? []);
            if (($persisted_imports[$source] ?? null) !== $imports[$source] ||
                serialize(maybe_unserialize($persisted['cart'] ?? null)) !== serialize($session->get('cart'))) {
                throw new RuntimeException('Cart transfer could not be persisted.');
            }
            $imports[$source]['state'] = 'complete';
            $session->set(self::IMPORTS, $imports);
            NRH_Headless_Checkout::persist_session($session);
            // Retire the guest data only after the account cart and replay marker
            // have been persisted together in Woo's session row.
            $this->retire_guest($session, $guest);
            $cart_session->persistent_cart_update();
            return new WP_REST_Response(['merged' => true]);
        } catch (Throwable $error) {
            return $this->error('cart_sync_unavailable', 'انتقال سبد کامل نشد. اقلام مهمان محفوظ‌اند؛ دوباره سبد را بررسی کنید.', 502);
        } finally {
            // Failed partial acquisitions have not loaded a session. Once loaded,
            // retain both locks until every shutdown hook has finished saving.
            if ($this->locks === []) foreach (array_reverse($acquired) as $key) {
                $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $key));
            }
        }
    }
}
