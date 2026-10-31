<?php
defined('ABSPATH') || exit;

/** Serialize BFF Store API requests at the session's shared database. */
final class NRH_Cart_Lock {
    private const PROTOCOL = 'mysql-v1';
    private ?string $key = null;
    private ?string $identity = null;
    private ?WP_REST_Request $request = null;

    public function register(): void {
        add_filter('rest_pre_dispatch', [$this, 'acquire'], -100, 3);
        add_filter('rest_post_dispatch', [$this, 'response'], PHP_INT_MAX, 3);
        // Woo persists sessions at shutdown priority 20. Never unlock earlier:
        // another request must not read a snapshot that has not been saved yet.
        add_action('shutdown', [$this, 'release'], PHP_INT_MAX);
    }

    private function error(string $code, string $message, int $status): WP_Error {
        return new WP_Error($code, $message, ['status' => $status]);
    }

    private function participates(WP_REST_Request $request): bool {
        return $request->get_header('x-nrh-cart-lock') === self::PROTOCOL &&
            (bool) preg_match('#^/wc/store/v1/cart(?:/|$)#D', $request->get_route());
    }

    private function failed_response(string $code, string $message) {
        $response = rest_convert_error_to_response($this->error($code, $message, 503));
        $response->header('Cache-Control', 'private, no-store, max-age=0');
        return $response;
    }

    public function acquire($result, $server, WP_REST_Request $request) {
        if ($result !== null || !$this->participates($request)) return $result;
        // Internal batch dispatches share PHP session globals. Only one cart
        // request may participate in this protocol per HTTP request.
        if ($this->request !== null || WC()->session !== null || WC()->cart !== null) {
            return $this->error('cart_session_loaded_early', 'نشست سبد پیش از هماهنگ‌سازی بارگذاری شده است.', 503);
        }
        // WP_REST_Request returns null for an absent header (not an empty string).
        $token = (string) $request->get_header('cart-token');
        // Woo selects the token session from the outer HTTP header, including
        // during internal REST dispatch. Never lock a different subrequest token.
        $http_token = sanitize_text_field(wp_unslash($_SERVER['HTTP_CART_TOKEN'] ?? ''));
        if ($token !== $http_token) {
            return $this->error('invalid_cart_transport', 'روش ارسال نشست سبد معتبر نیست.', 403);
        }
        if ($token !== '') {
            $tokens = \Automattic\WooCommerce\StoreApi\Utilities\CartTokenUtils::class;
            try {
                if (strlen($token) > 3800 || !class_exists($tokens) || !$tokens::validate_cart_token($token)) {
                    return $this->error('invalid_cart_token', 'نشست سبد مهمان معتبر نیست. سبد را تازه‌سازی کنید.', 403);
                }
                $payload = $tokens::get_cart_token_payload($token);
                $identity = $payload['user_id'] ?? null;
                // Account requests must use the native cookie + WP nonce path.
                if (!is_string($identity) || !preg_match('/^(?:t_[a-zA-Z0-9_-]{16,126}|[a-f0-9]{32})$/D', $identity) || ctype_digit($identity)) {
                    return $this->error('invalid_cart_token', 'نشست سبد مهمان معتبر نیست.', 403);
                }
            } catch (Throwable $error) {
                return $this->error('invalid_cart_token', 'نشست سبد مهمان معتبر نیست.', 403);
            }
        } elseif (get_current_user_id() > 0) {
            if (!wp_verify_nonce($request->get_header('x-wp-nonce'), 'wp_rest')) {
                return $this->error('rest_cookie_invalid_nonce', 'نشست حساب معتبر نیست.', 403);
            }
            $identity = (string) get_current_user_id();
        } else {
            if ($request->get_method() !== 'GET') {
                return $this->error('cart_session_required', 'ابتدا سبد خرید را دریافت کنید.', 409);
            }
            // No existing identity: Woo creates a random guest session in GET.
            $identity = null;
        }

        if ($identity !== null) {
            global $wpdb;
            $key = NRH_Headless_Checkout::session_lock_key($identity);
            if ('1' !== (string) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 3)', $key))) {
                return $this->error('cart_busy', 'سبد در حال به‌روزرسانی است. کمی بعد دوباره بررسی کنید.', 409);
            }
            $this->key = $key;
            // No cached session/user metadata from before the lock may be used.
            wp_cache_delete(WC_Cache_Helper::get_cache_prefix(WC_SESSION_CACHE_GROUP) . $identity, WC_SESSION_CACHE_GROUP);
            if (ctype_digit($identity)) wp_cache_delete((int) $identity, 'user_meta');
        }
        $this->identity = $identity;
        $this->request = $request;
        return $result;
    }

    public function response($response, $server, WP_REST_Request $request) {
        if (!$this->participates($request)) return $response;
        $response->header('Cache-Control', 'private, no-store, max-age=0');
        if ($this->request !== $request) return $response;
        if ($response->get_status() >= 400) return $response;
        $session = WC()->session;
        if (!$session || !is_callable([$session, 'save_data']) ||
            ($this->identity !== null && (string) $session->get_customer_id() !== $this->identity)) {
            return $this->failed_response('invalid_cart_identity', 'نشست معتبر سبد دریافت نشد.');
        }
        // Persist before acknowledging success; retain the connection lock through
        // shutdown too, in case a later Woo hook updates the same session again.
        try {
            $data = $response->get_data();
            if (is_array($data) && isset($data['items'])) {
                $data['nrh_checkout'] = NRH_Headless_Checkout::cart_details();
                $response->set_data($data);
            }
            NRH_Headless_Checkout::persist_session($session);
        } catch (Throwable $error) {
            return $this->failed_response('cart_save_failed', 'ذخیرهٔ سبد خرید ممکن نشد.');
        }
        $response->header('X-NRH-Cart-Lock', self::PROTOCOL);
        return $response;
    }

    public function release(): void {
        if ($this->key !== null) {
            global $wpdb;
            $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $this->key));
            $this->key = null;
        }
    }
}
