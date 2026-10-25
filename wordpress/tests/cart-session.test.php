<?php
// Contract/security tests with session storage and Woo API doubles, not a real WP DB.
define('ABSPATH', __DIR__);
define('DAY_IN_SECONDS', 86400);
define('WC_SESSION_CACHE_GROUP', 'wc_session_id');
error_reporting(E_ALL);
set_error_handler(static function ($level, $message, $file, $line) { throw new ErrorException($message, 0, $level, $file, $line); });

final class WP_Error {
    public function __construct(public string $code, public string $message, public array $data = []) {}
}
final class WP_REST_Response {
    public function __construct(public mixed $data = null, public int $status = 200) {}
}
final class WP_REST_Request {
    public array $headers = ['x-wp-nonce' => 'valid-nonce'];
    public array $json;
    public string $body;
    public function __construct() {
        $this->json = ['guest_token' => 'signed-guest-token']; $this->body = json_encode($this->json);
    }
    public function get_header($key) { return $this->headers[$key] ?? ''; }
    public function get_json_params() { return $this->json; }
    public function get_body() { return $this->body; }
}
final class TestTokens {
    public static function validate_cart_token($token) { return $token === 'signed-guest-token'; }
    public static function get_cart_token_payload($token) { return ['user_id' => $GLOBALS['guest'], 'exp' => time() + 2 * DAY_IN_SECONDS]; }
}
class_alias(TestTokens::class, 'Automattic\\WooCommerce\\StoreApi\\Utilities\\CartTokenUtils');
final class TestController {
    public function load_cart() { $GLOBALS['loads']++; }
}
class_alias(TestController::class, 'Automattic\\WooCommerce\\StoreApi\\Utilities\\CartController');
final class WC_Cache_Helper { public static function get_cache_prefix($group) { return 'prefix_'; } }
function sanitize_key($key) { return preg_replace('/[^a-z0-9_\-]/', '', strtolower($key)); }
function maybe_serialize($value) { return is_array($value) || is_object($value) ? serialize($value) : $value; }
function maybe_unserialize($value) {
    return is_string($value) && preg_match('/^(?:a|O|s|i|d|b):|^N;$/', $value) ? unserialize($value) : $value;
}
// Use Woo's actual set/get serialization, not an imitation in the adapter double.
require __DIR__ . '/fixtures/abstract-wc-session.php';
class WC_Session_Handler extends WC_Session {
    public string $id = '7';
    public function init_session_cookie() { $this->_data = $this->get_session($this->id, []); }
    public function get_customer_id() { return $this->id; }
    public function get_session($id, $default = false) { return $GLOBALS['store'][(string) $id] ?? $default; }
    public function save_data() {
        $GLOBALS['saves']++;
        if (!$GLOBALS['save_fails']) $GLOBALS['store'][$this->id] = $this->_data;
    }
    public function delete_session($id) { if (!$GLOBALS['delete_fails']) unset($GLOBALS['store'][(string) $id]); }
}
final class TestCart {
    public array $items = [];
    public function calculate_totals() { $GLOBALS['calculations']++; }
}
final class WC_Cart_Session {
    public function __construct(private TestCart $cart) {}
    public function get_cart_from_session() {
        $GLOBALS['rehydrations']++;
        $this->cart->items = WC()->session->get('cart', []);
    }
    public function get_cart_for_session() { return $this->cart->items; }
    public function set_session() { WC()->session->set('cart', $this->cart->items); }
    public function persistent_cart_update() { $GLOBALS['persistent_updates']++; }
}
final class TestWoo {
    public mixed $session;
    public TestCart $cart;
    public function __construct() { $this->session = new WC_Session_Handler(); $this->cart = new TestCart(); }
    public function initialize_session() {}
}
final class TestDB {
    public function prepare($sql, $key) { return [$sql, $key]; }
    public function get_var($query) {
        if (str_contains($query[0], 'RELEASE_LOCK')) { $GLOBALS['released'][] = $query[1]; return '1'; }
        $GLOBALS['acquired'][] = $query[1];
        if ($query[1] === ($GLOBALS['held_payment_lock'] ?? null)) return '0';
        return count($GLOBALS['acquired']) === $GLOBALS['busy_at'] ? '0' : '1';
    }
}
function get_current_user_id() { return $GLOBALS['user']; }
function wp_verify_nonce($nonce, $action) { return $nonce === 'valid-nonce' && $action === 'wp_rest'; }
function is_wp_error($value) { return $value instanceof WP_Error; }
function WC() { return $GLOBALS['wc']; }
function wp_cache_delete($key, $group) { $GLOBALS['cache_deletes'][] = [$key, $group]; }
function add_action(...$args) {}
function register_rest_route(...$args) {}
require __DIR__ . '/../nrh-headless-checkout/includes/class-nrh-headless-checkout.php';
require __DIR__ . '/../nrh-headless-checkout/includes/class-nrh-cart-session.php';

function check($condition, $message = 'assertion') { if (!$condition) throw new RuntimeException($message); }
function eq($actual, $expected) { check($actual === $expected, var_export($actual, true) . ' !== ' . var_export($expected, true)); }
function read_store($id) { return array_map('maybe_unserialize', $GLOBALS['store'][$id]); }
function reset_case() {
    $GLOBALS['user'] = 7; $GLOBALS['guest'] = 't_' . str_repeat('a', 30);
    $GLOBALS['acquired'] = []; $GLOBALS['released'] = []; $GLOBALS['cache_deletes'] = [];
    $GLOBALS['busy_at'] = 0; $GLOBALS['held_payment_lock'] = null; $GLOBALS['saves'] = 0; $GLOBALS['loads'] = 0; $GLOBALS['rehydrations'] = 0;
    $GLOBALS['calculations'] = 0; $GLOBALS['persistent_updates'] = 0; $GLOBALS['save_fails'] = false; $GLOBALS['delete_fails'] = false;
    $GLOBALS['store'] = [
        '7' => ['cart' => ['same' => ['product_id' => 12, 'quantity' => 1], 'account' => ['product_id' => 13, 'quantity' => 1]], 'customer' => ['email' => 'account@example.test'], 'applied_coupons' => ['ACCOUNT']],
        $GLOBALS['guest'] => ['cart' => ['same' => ['product_id' => 12, 'quantity' => 2], 'guest' => ['product_id' => 14, 'quantity' => 1, 'variation' => ['pa_color' => 'black'], 'custom' => ['engraving' => 'sample']]], 'customer' => ['email' => 'guest@example.test'], 'store_api_draft_order' => 999, 'applied_coupons' => ['GUEST']],
    ];
    foreach ($GLOBALS['store'] as $id => $data) $GLOBALS['store'][$id] = array_map('maybe_serialize', $data);
    $GLOBALS['wc'] = new TestWoo(); $GLOBALS['wpdb'] = new TestDB();
}
$passed = 0; $failed = 0;
function test_case($name, $work) {
    global $passed, $failed;
    reset_case();
    try { $work(new NRH_Cart_Session(new NRH_Headless_Checkout())); echo "PASS $name\n"; $passed++; }
    catch (Throwable $error) { fwrite(STDERR, "FAIL $name: {$error->getMessage()}\n"); $failed++; }
}
test_case('anonymous and missing nonce requests cannot read or mutate guest data', function ($bridge) {
    $GLOBALS['user'] = 0; eq($bridge->merge(new WP_REST_Request())->data['status'], 401);
    $GLOBALS['user'] = 7; $request = new WP_REST_Request(); $request->headers = [];
    eq($bridge->merge($request)->data['status'], 403); eq($GLOBALS['acquired'], []);
});
test_case('forged and expired tokens are rejected before taking locks', function ($bridge) {
    foreach (['forged', '', 'expired'] as $token) {
        $request = new WP_REST_Request(); $request->json['guest_token'] = $token;
        eq($bridge->merge($request)->data['status'], 403);
    }
    eq($GLOBALS['acquired'], []);
});
test_case('account identities cannot be imported as guest carts', function ($bridge) {
    foreach (['7', '8', str_repeat('1', 32), '../../private', null] as $id) {
        $GLOBALS['guest'] = $id;
        eq($bridge->merge(new WP_REST_Request())->data['status'], 403);
    }
    eq($GLOBALS['saves'], 0);
});
test_case('unexpected fields, oversized bodies and token headers are rejected', function ($bridge) {
    $request = new WP_REST_Request(); $request->json['user_id'] = 8;
    eq($bridge->merge($request)->data['status'], 400);
    $request = new WP_REST_Request(); $request->body = str_repeat('x', 4097);
    eq($bridge->merge($request)->data['status'], 400);
    $request = new WP_REST_Request(); $request->headers['cart-token'] = 'signed-guest-token';
    eq($bridge->merge($request)->data['status'], 400); eq($GLOBALS['saves'], 0);
});
test_case('native Woo session preserves both carts, variation metadata, coupons and account privacy', function ($bridge) {
    eq($bridge->merge(new WP_REST_Request())->status, 200);
    $data = read_store('7');
    eq(count($data['cart']), 3); eq($data['cart']['same']['quantity'], 2);
    eq($data['cart']['guest']['variation'], ['pa_color' => 'black']);
    eq($data['cart']['guest']['custom'], ['engraving' => 'sample']);
    eq($data['customer']['email'], 'account@example.test');
    check(!isset($data['store_api_draft_order'])); eq($data['applied_coupons'], ['ACCOUNT', 'GUEST']);
    check(!isset($GLOBALS['store'][$GLOBALS['guest']]));
    eq($GLOBALS['calculations'], 1); check($GLOBALS['rehydrations'] >= 2);
    eq(count($GLOBALS['released']), 2);
});
test_case('100 retries cannot duplicate items or overwrite later account quantity edits', function ($bridge) {
    eq($bridge->merge(new WP_REST_Request())->status, 200);
    $cart = read_store('7')['cart']; $cart['same']['quantity'] = 4;
    $GLOBALS['store']['7']['cart'] = maybe_serialize($cart);
    for ($i = 0; $i < 100; $i++) eq($bridge->merge(new WP_REST_Request())->status, 200);
    eq(read_store('7')['cart']['same']['quantity'], 4);
    eq($GLOBALS['saves'], 1); eq($GLOBALS['calculations'], 1);
});
test_case('payment account lock blocks import without retiring either cart', function ($bridge) {
    $before = $GLOBALS['store'];
    $GLOBALS['held_payment_lock'] = NRH_Headless_Checkout::session_lock_key('7');
    eq($bridge->merge(new WP_REST_Request())->code, 'cart_busy');
    eq($GLOBALS['store'], $before); eq($GLOBALS['saves'], 0);
    $successful = array_values(array_filter($GLOBALS['acquired'], static fn($key) => $key !== $GLOBALS['held_payment_lock']));
    eq($GLOBALS['released'], array_reverse($successful));
});

test_case('a second busy lock releases the first lock without changing the carts', function ($bridge) {
    $GLOBALS['busy_at'] = 2; $before = $GLOBALS['store'];
    eq($bridge->merge(new WP_REST_Request())->code, 'cart_busy');
    eq($GLOBALS['store'], $before); eq(count($GLOBALS['released']), 1);
});
test_case('failed storage preserves guest data and never reports successful transfer', function ($bridge) {
    $GLOBALS['save_fails'] = true;
    eq($bridge->merge(new WP_REST_Request())->data['status'], 502);
    check(isset($GLOBALS['store'][$GLOBALS['guest']]));
    check(!isset($GLOBALS['store']['7']['_nrh_imported_guest_carts']));
    eq(count($GLOBALS['released']), 2);
});
test_case('failed guest retirement can be retried using the persisted import marker', function ($bridge) {
    $GLOBALS['delete_fails'] = true;
    eq($bridge->merge(new WP_REST_Request())->data['status'], 502);
    check(isset($GLOBALS['store'][$GLOBALS['guest']]));
    $GLOBALS['delete_fails'] = false;
    eq($bridge->merge(new WP_REST_Request())->status, 200);
    eq($GLOBALS['saves'], 1); check(!isset($GLOBALS['store'][$GLOBALS['guest']]));
});
test_case('wrong account session and incompatible handlers fail closed', function ($bridge) {
    WC()->session->id = '8';
    eq($bridge->merge(new WP_REST_Request())->data['status'], 403);
    WC()->session = new stdClass();
    eq($bridge->merge(new WP_REST_Request())->data['status'], 503); eq($GLOBALS['saves'], 0);
});
test_case('imports are bounded and both token-session and account caches are invalidated', function ($bridge) {
    $GLOBALS['store']['7']['_nrh_imported_guest_carts'] = array_fill_keys(range(0, 49), time() + 3600);
    eq($bridge->merge(new WP_REST_Request())->data['status'], 429);
    check(in_array(['prefix_' . $GLOBALS['guest'], WC_SESSION_CACHE_GROUP], $GLOBALS['cache_deletes'], true));
    check(in_array(['prefix_7', WC_SESSION_CACHE_GROUP], $GLOBALS['cache_deletes'], true));
    eq($GLOBALS['saves'], 0);
});
echo json_encode(['passed' => $passed, 'failed' => $failed, 'environment' => 'WordPress/Woo API doubles; no real database or bank'], JSON_PRETTY_PRINT) . "\n";
exit($failed ? 1 : 0);
