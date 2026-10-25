<?php
defined('ABSPATH') || exit;

/** Transfer a bearer guest cart to the authenticated user's native Woo session. */
final class NRH_Cart_Session {
    private const IMPORTS = '_nrh_imported_guest_carts';
    private NRH_Headless_Checkout $checkout;

    public function __construct(NRH_Headless_Checkout $checkout) {
        $this->checkout = $checkout;
    }

    public function register(): void {
        add_action('rest_api_init', [$this, 'routes']);
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

    private function retire_guest($session, string $guest): void {
        $session->delete_session($guest);
        $this->clear_cache($guest);
        if ($session->get_session($guest, []) !== []) {
            throw new RuntimeException('Guest cart retirement could not be persisted.');
        }
    }

    public function merge(WP_REST_Request $request) {
        $permission = $this->checkout->authenticated($request);
        if (is_wp_error($permission)) return $permission;
        $input = $request->get_json_params();
        if (strlen($request->get_body()) > 4096 || !is_array($input) ||
            array_keys($input) !== ['guest_token'] || !is_string($input['guest_token']) ||
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
        $acquired = [];
        try {
            foreach ($locks as $key) {
                if ('1' !== (string) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 0)', $key))) {
                    return $this->error('cart_busy', 'سبد در حال به‌روزرسانی است. کمی بعد دوباره بررسی کنید.');
                }
                $acquired[] = $key;
            }
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
            $imports = is_array($imports) ? array_filter($imports, static fn($until) => is_int($until) && $until > time()) : [];
            $source = hash('sha256', $guest);
            if (isset($imports[$source])) {
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
            // Match Woo's saved-cart semantics: preserve different item keys;
            // for the same key, keep the guest's latest quantity rather than adding it twice.
            $session->set('cart', array_merge($account, $items));
            $session->set('cart_totals', null);
            $coupons = array_merge((array) $session->get('applied_coupons', []), (array) maybe_unserialize($data['applied_coupons'] ?? []));
            $session->set('applied_coupons', array_values(array_unique(array_filter($coupons, 'is_string'))));
            // Rehydrate through Woo so current products, variations, extensions,
            // pricing, stock rules, coupons and totals remain WooCommerce's responsibility.
            // Customer/address data and draft orders are deliberately not copied.
            $cart_session->get_cart_from_session();
            WC()->cart->calculate_totals();
            $cart_session->set_session();
            $imports[$source] = max(time() + DAY_IN_SECONDS, (int) ($payload['exp'] ?? 0));
            $session->set(self::IMPORTS, $imports);
            $session->save_data();
            $this->clear_cache($user);
            $persisted = $session->get_session($user, []);
            $persisted_imports = maybe_unserialize($persisted[self::IMPORTS] ?? []);
            if (($persisted_imports[$source] ?? null) !== $imports[$source] ||
                serialize(maybe_unserialize($persisted['cart'] ?? null)) !== serialize($session->get('cart'))) {
                throw new RuntimeException('Cart transfer could not be persisted.');
            }
            // Retire the guest data only after the account cart and replay marker
            // have been persisted together in Woo's session row.
            $this->retire_guest($session, $guest);
            $cart_session->persistent_cart_update();
            return new WP_REST_Response(['merged' => true]);
        } catch (Throwable $error) {
            return $this->error('cart_sync_unavailable', 'انتقال سبد کامل نشد. اقلام مهمان محفوظ‌اند؛ دوباره سبد را بررسی کنید.', 502);
        } finally {
            foreach (array_reverse($acquired) as $key) {
                $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $key));
            }
        }
    }
}
