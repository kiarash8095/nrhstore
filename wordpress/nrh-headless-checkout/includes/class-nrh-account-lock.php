<?php
defined('ABSPATH') || exit;

/** Shared serialization for the existing Boom account endpoints used by the BFF. */
final class NRH_Account_Lock {
    private ?string $key = null;
    private ?WP_REST_Request $request = null;
    private NRH_Headless_Checkout $checkout;

    public function __construct(NRH_Headless_Checkout $checkout) { $this->checkout = $checkout; }

    public function register(): void {
        add_action('rest_api_init', [$this, 'routes']);
        add_filter('rest_pre_dispatch', [$this, 'acquire'], -110, 3);
        add_filter('rest_post_dispatch', [$this, 'response'], PHP_INT_MAX, 3);
        add_action('shutdown', [$this, 'release'], PHP_INT_MAX);
    }

    public function routes(): void {
        register_rest_route('nrh/v1', '/capabilities', [
            'methods' => 'GET', 'callback' => [$this, 'capabilities'],
            'permission_callback' => [$this->checkout, 'authenticated'],
        ]);
    }

    public function capabilities(WP_REST_Request $request) {
        $permission = $this->checkout->authenticated($request);
        if (is_wp_error($permission)) return $permission;
        $response = new WP_REST_Response(['version' => '1.4.0', 'account_lock' => 'mysql-v1', 'cart_merge' => 'sum-v1', 'checkout' => 'bank-and-bacs-v1']);
        $response->header('Cache-Control', 'private, no-store, max-age=0');
        return $response;
    }

    private function participates(WP_REST_Request $request): bool {
        return $request->get_header('x-nrh-account-lock') === 'mysql-v1' &&
            (bool) preg_match('#^/boom/v1/(?:profile-fields|wishlist(?:/[1-9][0-9]*)?|addresses(?:/[1-9][0-9]*(?:/default)?)?)$#D', $request->get_route());
    }

    private function error(string $code, string $message, int $status = 503): WP_Error {
        return new WP_Error($code, $message, ['status' => $status]);
    }

    public function acquire($result, $server, WP_REST_Request $request) {
        if ($result !== null || !$this->participates($request)) return $result;
        $permission = $this->checkout->authenticated($request);
        if (is_wp_error($permission)) return $permission;
        if ($request->get_header('cart-token')) return $this->error('invalid_account_transport', 'روش ارسال نشست حساب معتبر نیست.', 400);
        if ($this->request !== null || WC()->session !== null || WC()->cart !== null) {
            return $this->error('account_session_loaded_early', 'نشست حساب پیش از هماهنگ‌سازی بارگذاری شده است.');
        }
        global $wpdb;
        $user = (string) get_current_user_id();
        $key = NRH_Headless_Checkout::session_lock_key($user);
        if ('1' !== (string) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 3)', $key))) {
            return $this->error('account_busy', 'حساب در حال به‌روزرسانی است. کمی بعد دوباره تلاش کنید.', 409);
        }
        $this->key = $key;
        $this->request = $request;
        wp_cache_delete((int) $user, 'user_meta');
        wp_cache_delete(WC_Cache_Helper::get_cache_prefix(WC_SESSION_CACHE_GROUP) . $user, WC_SESSION_CACHE_GROUP);
        return $result;
    }

    public function response($response, $server, WP_REST_Request $request) {
        if (!$this->participates($request)) return $response;
        $response->header('Cache-Control', 'private, no-store, max-age=0');
        if ($this->request !== $request || $response->get_status() >= 400) return $response;
        // Address/profile hooks may also initialize Woo's session. Keep its save
        // under the same account lock as cart writes, merge and paid-cart cleanup.
        try {
            if (WC()->session !== null) {
                if ((string) WC()->session->get_customer_id() !== (string) get_current_user_id()) throw new RuntimeException('Wrong session');
                NRH_Headless_Checkout::persist_session(WC()->session);
            }
        } catch (Throwable $error) {
            $failed = rest_convert_error_to_response($this->error('account_save_failed', 'ذخیرهٔ نشست حساب ممکن نشد.'));
            $failed->header('Cache-Control', 'private, no-store, max-age=0');
            return $failed;
        }
        $response->header('X-NRH-Account-Lock', 'mysql-v1');
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
