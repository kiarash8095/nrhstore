<?php
// Isolated protocol/lifecycle tests. No production cart, database or payment is used.
define('ABSPATH', __DIR__);
define('WC_SESSION_CACHE_GROUP', 'wc_session_id');
error_reporting(E_ALL);
set_error_handler(static function ($level, $message, $file, $line) { throw new ErrorException($message, 0, $level, $file, $line); });
final class WP_Error {
    public function __construct(public string $code, public string $message, public array $data) {}
}
final class WP_REST_Request {
    public array $headers = ['x-nrh-cart-lock' => 'mysql-v1', 'cart-token' => 'signed-token'];
    public string $route = '/wc/store/v1/cart';
    public string $method = 'GET';
    public function get_header($name) { return $this->headers[$name] ?? null; }
    public function get_route() { return $this->route; }
    public function get_method() { return $this->method; }
}
final class WP_REST_Response {
    public array $headers = [];
    public function __construct(public mixed $data = [], public int $status = 200) {}
    public function get_status() { return $this->status; }
    public function get_data() { return $this->data; }
    public function set_data($data) { $this->data = $data; }
    public function header($name, $value) { $this->headers[$name] = $value; }
}
function rest_convert_error_to_response($error) { return new WP_REST_Response(['code' => $error->code], $error->data['status']); }
function get_current_user_id() { return $GLOBALS['user']; }
function is_wp_error($value) { return $value instanceof WP_Error; }
function wp_verify_nonce($nonce, $action) { return $nonce === 'valid-wp-nonce' && $action === 'wp_rest'; }
function wc_clean($value) { return $value; }
function sanitize_text_field($value) { return $value; }
function wp_unslash($value) { return $value; }
function maybe_unserialize($value) { return is_string($value) && str_starts_with($value, 'a:') ? unserialize($value) : $value; }
function wp_cache_delete($key, $group) { $GLOBALS['events'][] = ['cache', $key, $group]; }
function add_filter($hook, $callback, $priority, $argc) { $GLOBALS['hooks'][$hook] = [$callback, $priority, $argc]; }
function add_action($hook, $callback, $priority = 10) { $GLOBALS['hooks'][$hook] = [$callback, $priority]; }
final class WC_Cache_Helper { public static function get_cache_prefix($group) { return 'prefix_'; } }
final class TestTokens {
    public static function validate_cart_token($token) { return $token === 'signed-token'; }
    public static function get_cart_token_payload($token) { return ['user_id' => $GLOBALS['guest']]; }
}
class_alias(TestTokens::class, 'Automattic\\WooCommerce\\StoreApi\\Utilities\\CartTokenUtils');
final class TestSession {
    public function __construct(public string $id) {}
    public function get_customer_id() { return $this->id; }
    public function get($key) { return $key === 'cart' ? ['test' => ['quantity' => 1]] : null; }
    public function get_session($id, $default) { return !empty($GLOBALS['silent_save_fails']) ? [] : ['cart' => $this->get('cart')]; }
    public function save_data() {
        $GLOBALS['events'][] = ['save'];
        if ($GLOBALS['save_fails']) throw new RuntimeException('storage failed');
    }
}
final class TestWoo { public mixed $session = null; public mixed $cart = null; }
function WC() { return $GLOBALS['woo']; }
final class TestDb {
    public string $prefix = 'wp_';
    public array $held = [];
    public bool $busy = false;
    public function prepare($sql, ...$args) { return [$sql, $args]; }
    public function get_var($query) {
        [$sql, $args] = $query; $key = $args[0];
        if (str_contains($sql, 'SELECT session_value')) return serialize(WC()->session->get_session($args[1], []));
        if (str_contains($sql, 'GET_LOCK')) {
            $GLOBALS['events'][] = ['acquire', $key];
            if ($this->busy || isset($this->held[$key])) return '0';
            $this->held[$key] = true; return '1';
        }
        $GLOBALS['events'][] = ['release', $key]; unset($this->held[$key]); return '1';
    }
}
require __DIR__ . '/../../nrh-headless-checkout/includes/class-nrh-headless-checkout.php';
require __DIR__ . '/../../nrh-headless-checkout/includes/class-nrh-cart-lock.php';

