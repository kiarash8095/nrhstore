<?php
// Isolated contract/security tests. No WordPress database or bank traffic is used.
define('ABSPATH', __DIR__);
define('DAY_IN_SECONDS', 86400);
define('WC_SESSION_CACHE_GROUP', 'wc_session_id');
final class WC_Cache_Helper { public static function get_cache_prefix($group) { return 'prefix_'; } }
define('NRH_HEADLESS_FRONTEND_URL', 'https://shop.example.test');
error_reporting(E_ALL);
set_error_handler(static function ($level, $message, $file, $line) { throw new ErrorException($message, 0, $level, $file, $line); });

final class WP_Error {
    public function __construct(public string $code, public string $message, public array $data = []) {}
    public function get_error_code() { return $this->code; }
}
final class WP_REST_Response {
    public array $headers;
    public function __construct(public mixed $data = null, public int $status = 200, array $headers = []) { $this->headers = $headers; }
    public function get_status() { return $this->status; }
    public function header($name, $value) { $this->headers[$name] = $value; }
}
final class WP_REST_Request implements ArrayAccess {
    public array $json = [], $params = [], $query = [], $headers = ['x-wp-nonce' => 'valid-nonce', 'nonce' => 'valid-store-nonce'];
    public string $body = '{}';
    public function __construct(public string $method = 'POST', public string $route = '/nrh/v1/checkout') {}
    public function get_json_params() { return $this->json; }
    public function get_body() { return $this->body; }
    public function get_body_params() { return $this->params; }
    public function get_query_params() { return $this->query; }
    public function get_header($key) { return $this->headers[$key] ?? ''; }
    public function set_header($key, $value) { $this->headers[$key] = $value; }
    public function set_body_params($value) { $this->params = $value; }
    public function get_route() { return $this->route; }
    public function offsetExists(mixed $key): bool { return isset($this->params[$key]); }
    public function offsetGet(mixed $key): mixed { return $this->params[$key] ?? null; }
    public function offsetSet(mixed $key, mixed $value): void { $this->params[$key] = $value; }
    public function offsetUnset(mixed $key): void { unset($this->params[$key]); }
}
final class TestOrder {
    public array $meta = [], $persisted_meta = [];
    public bool $paid = false;
    public string $method = 'melli_pay', $state = 'pending', $note = '';
    public int $completions = 0;
    public string $total = '250000.00', $currency = 'IRT';
    public function __construct(public int $id = 55, public int $user = 7) {}
    public function get_id() { return $this->id; }
    public function get_customer_id() { return $this->user; }
    public function get_total() { return $this->total; }
    public function get_currency() { return $this->currency; }
    public function get_payment_method() { return $this->method; }
    public function is_paid() { return $this->paid; }
    public function get_status() { return $this->paid ? 'processing' : $this->state; }
    public function get_meta($key, $single = true) { return $this->meta[$key] ?? ''; }
    public function update_meta_data($key, $value) { $this->meta[$key] = $value; }
    public function save() { if (!$GLOBALS['meta_storage_fail']) $this->persisted_meta = $this->meta; }
    public function read_meta_data($force) { $this->meta = $this->persisted_meta; }
    public function payment_complete($trace) { $this->paid = true; $this->completions++; }
    public function has_cart_hash($hash) { return $hash === 'original-cart'; }
}
final class TestPaymentResult {
    public string $status = '', $url = '';
    public function set_status($status) { $this->status = $status; }
    public function set_redirect_url($url) { $this->url = $url; }
}
final class TestDB {
    public string $prefix = 'wp_';
    public function prepare($query, ...$args) { return array_merge([$query], $args); }
    public function get_var($query) {
        if (str_contains($query[0], 'SELECT session_value')) return serialize([]);
        if (str_contains($query[0], 'GET_LOCK')) return $GLOBALS['lock_busy'] || $query[1] === ($GLOBALS['held_cart_lock'] ?? null) ? '0' : '1';
        return '1';
    }
}
final class TestCart {
    public int $clears = 0;
    public string $hash = 'original-cart';
    public function get_cart_hash() { return $this->hash; }
    public function empty_cart() { $this->clears++; }
}
final class TestSession {
    public function save_data() {}
    public function get_customer_id() { return '7'; }
    public function get_session($id, $default) { return []; }
    public function get($key) { return null; }
}
final class TestBacsGateway {
    public function process_payment($id) {
        $GLOBALS['bacs_calls']++;
        $GLOBALS['orders'][$id]->state = 'on-hold';
        WC()->cart->empty_cart();
        if ($GLOBALS['bacs_throw']) throw new RuntimeException('private gateway failure');
        return ['result' => 'success', 'redirect' => 'https://cms.example.test/order-received/55'];
    }
    public function get_title() { return '<b>Bank transfer</b>'; }
    public function get_description() { return '<p>Manual deposit</p>'; }
}
final class TestGateways {
    public function get_available_payment_gateways() { return $GLOBALS['bacs_enabled'] ? ['bacs' => new TestBacsGateway()] : []; }
}
final class TestWoo {
    public TestCart $cart;
    public TestSession $session;
    public function __construct() { $this->cart = new TestCart(); $this->session = new TestSession(); }
    public function payment_gateways() { return new TestGateways(); }
}
function maybe_unserialize($value) { return is_string($value) && str_starts_with($value, 'a:') ? unserialize($value) : $value; }
final class TestCartTokens {
    public static function validate_cart_token($token) { return $token === 'signed-token'; }
    public static function get_cart_token_payload($token) { return ['user_id' => $GLOBALS['token_user']]; }
}
class_alias(TestCartTokens::class, 'Automattic\\WooCommerce\\StoreApi\\Utilities\\CartTokenUtils');
function get_current_user_id() { return $GLOBALS['user']; }
function wp_verify_nonce($nonce, $action) { return ($nonce === 'valid-nonce' && $action === 'wp_rest') || ($nonce === 'valid-store-nonce' && $action === 'wc_store_api'); }
function get_user_meta($id, $key, $single) { return $GLOBALS['users'][$id][$key] ?? ''; }
function update_user_meta($id, $key, $data) { if (!$GLOBALS['storage_fail']) $GLOBALS['users'][$id][$key] = $data; }
function get_option($key, $default = false) {
    if ($key === 'woocommerce_bacs_settings') return ['instructions' => 'Use the order number for transfer.'];
    if ($key === 'woocommerce_bacs_accounts') return [['account_name' => 'Audit merchant', 'account_number' => '123456', 'bank_name' => 'Audit bank', 'iban' => 'IR123456', 'private_key' => 'SECRET']];
    return $GLOBALS['settings'];
}
function wc_get_order($id) { return $GLOBALS['orders'][$id] ?? false; }
function wp_die($message, $title = '', $args = []) { throw new RuntimeException('legacy payment blocked', $args['response'] ?? 500); }
function wc_get_price_decimals() { return 0; }
function wp_json_encode($data) { return json_encode($data); }
function wp_parse_url($url) { return parse_url($url); }
function wp_date($format) { return gmdate($format); }
function rest_url($path) { return 'https://cms.example.test/wp-json/' . $path; }
function add_query_arg($params, $url) { return $url . '?' . http_build_query($params); }
function is_wp_error($value) { return $value instanceof WP_Error; }
function wp_remote_retrieve_response_code($value) { return $value['status']; }
function wp_remote_retrieve_body($value) { return $value['body']; }
function WC() { return $GLOBALS['wc']; }
function wc_load_cart() {}
function wp_cache_delete(...$args) {}
function wp_unslash($value) { return $value; }
function sanitize_text_field($value) { return is_scalar($value) ? (string) $value : ''; }
function sanitize_textarea_field($value) { return trim(strip_tags($value)); }
function wp_strip_all_tags($value) { return strip_tags($value); }
function apply_filters($hook, $value, ...$args) { return $value; }
function add_action(...$args) {}
function add_filter(...$args) {}
function register_rest_route(...$args) {}
function wp_remote_post($url, $args) {
    $GLOBALS['http'][] = [$url, $args];
    check($args['sslverify'] === true && $args['redirection'] === 0 && $args['timeout'] === 12, 'bounded verified TLS');
    check($args['limit_response_size'] === 16384, 'bounded bank response');
    $body = json_decode($args['body'], true);
    if (str_ends_with($url, '/PaymentRequest')) {
        $GLOBALS['bank_request'] = $body;
        if ($GLOBALS['bank_mode'] === 'timeout') return new WP_Error('timeout', 'private upstream data');
        if ($GLOBALS['bank_mode'] === 'decline') return ['status' => 200, 'body' => '{"ResCode":23}'];
        if ($GLOBALS['bank_mode'] === 'redirect') return ['status' => 302, 'body' => '{}'];
        return ['status' => 200, 'body' => json_encode(['ResCode' => 0, 'Token' => 'bank-token-1234567890'])];
    }
    if ($GLOBALS['verify_mode'] === 'timeout') return new WP_Error('timeout', 'SECRET');
    $request = $GLOBALS['bank_request'];
    $reply = ['ResCode' => 0, 'OrderId' => $request['OrderId'], 'Amount' => $request['Amount'], 'SystemTraceNo' => '123456', 'RetrivalRefNo' => '987654'];
    if ($GLOBALS['verify_mode'] === 'wrong_order') $reply['OrderId'] = '1';
    if ($GLOBALS['verify_mode'] === 'wrong_amount') $reply['Amount']++;
    if ($GLOBALS['verify_mode'] === 'expired') $reply['ResCode'] = 101;
    if ($GLOBALS['verify_mode'] === 'missing_trace') unset($reply['SystemTraceNo']);
    return ['status' => 200, 'body' => json_encode($reply)];
}
function rest_do_request($request) {
    $GLOBALS['dispatches']++;
    check($request->get_route() === '/wc/store/v1/checkout', 'delegate official checkout');
    check(in_array($request->params['payment_method'], ['melli_pay', 'bacs'], true), 'allowlisted registered gateway');
    check($request->get_header('nonce') === 'valid-store-nonce', 'forward Store API nonce');
    check($request->get_header('cart-token') === '', 'preserve native account session');
    if ($GLOBALS['core_mode'] === 'boom_error') throw new Error('Boom/inc/cart-sync.php SECRET');
    if ($GLOBALS['core_mode'] === 'invalid_address') return new WP_REST_Response(['private' => 'SECRET'], 400);
    $GLOBALS['orders'][55]->method = $request->params['payment_method'];
    $GLOBALS['orders'][55]->note = $request->params['customer_note'];
    $context = (object) ['payment_method' => $request->params['payment_method'], 'order' => $GLOBALS['orders'][55]];
    $result = new TestPaymentResult();
    try { $GLOBALS['bridge']->process_payment($context, $result); }
    catch (Throwable $error) { return new WP_REST_Response(null, 500); }
    check($result->status === 'success', 'payment initiation contract');
    check(!$GLOBALS['orders'][55]->paid, 'initiation never marks paid');
    return new WP_REST_Response(['payment_result' => ['redirect_url' => $result->url]]);
}
require __DIR__ . '/../nrh-headless-checkout/includes/class-nrh-headless-checkout.php';

function reset_case() {
    $GLOBALS['user'] = 7; $GLOBALS['users'] = []; $GLOBALS['orders'] = [55 => new TestOrder()];
    $GLOBALS['token_user'] = '7';
    $GLOBALS['http'] = []; $GLOBALS['dispatches'] = 0; $GLOBALS['lock_busy'] = false; $GLOBALS['held_cart_lock'] = null; $GLOBALS['storage_fail'] = false;
    $GLOBALS['meta_storage_fail'] = false;
    $GLOBALS['bank_mode'] = 'success'; $GLOBALS['verify_mode'] = 'success'; $GLOBALS['core_mode'] = 'success';
    $GLOBALS['settings'] = ['enabled' => 'yes', 'merchant_id' => '123', 'terminal_id' => '456', 'terminal_key' => base64_encode(str_repeat('a', 24))];
    $GLOBALS['bacs_calls'] = 0; $GLOBALS['bacs_enabled'] = true; $GLOBALS['bacs_throw'] = false;
    $GLOBALS['wpdb'] = new TestDB(); $GLOBALS['wc'] = new TestWoo();
    $GLOBALS['bridge'] = new NRH_Headless_Checkout();
}
function input_request($overrides = []) {
    $request = new WP_REST_Request();
    $request->json = array_replace(['attempt_id' => '01234567-89ab-4cde-8fab-0123456789ab', 'cart_hash' => str_repeat('a', 64), 'expected_total' => '250000', 'billing_address' => [], 'shipping_address' => []], $overrides);
    $request->body = json_encode($request->json);
    return $request;
}
function callback_request($overrides = []) {
    $request = new WP_REST_Request('POST', '/nrh/v1/sadad/callback');
    parse_str(parse_url($GLOBALS['bank_request']['ReturnUrl'], PHP_URL_QUERY), $request->query);
    $request->params = array_replace(['token' => 'bank-token-1234567890', 'OrderId' => $GLOBALS['bank_request']['OrderId'], 'ResCode' => '0'], $overrides);
    return $request;
}
function check($condition, $message = 'assertion') { if (!$condition) throw new RuntimeException($message); }
function eq($actual, $expected) { check($actual === $expected, var_export($actual, true) . ' !== ' . var_export($expected, true)); }
function test_case($name, $work) {
    reset_case();
    try { $work($GLOBALS['bridge']); echo "PASS $name\n"; $GLOBALS['passed']++; }
    catch (Throwable $error) { fwrite(STDERR, "FAIL $name: {$error->getMessage()}\n"); $GLOBALS['failed']++; }
}
$GLOBALS['passed'] = 0; $GLOBALS['failed'] = 0;

test_case('native BACS creates on-hold order, preserves notes and never calls Sadad', function ($bridge) {
    $input = input_request(['payment_method' => 'bacs', 'customer_note' => '<b>Call before delivery</b>']);
    $response = $bridge->checkout($input);
    eq($response->status, 200); eq($response->data['redirect_url'], 'https://shop.example.test/checkout/result?order=55');
    eq($GLOBALS['orders'][55]->state, 'on-hold'); check(!$GLOBALS['orders'][55]->paid);
    eq($GLOBALS['orders'][55]->note, 'Call before delivery'); eq($GLOBALS['bacs_calls'], 1); eq(count($GLOBALS['http']), 0);
    eq(WC()->cart->clears, 1);
    for ($i = 0; $i < 3; $i++) eq($bridge->checkout($input)->data['order_id'], 55);
    eq($GLOBALS['bacs_calls'], 1); eq(WC()->cart->clears, 1);
});
test_case('an attempt cannot change method or note after order creation', function ($bridge) {
    $bridge->checkout(input_request(['payment_method' => 'bacs', 'customer_note' => 'first']));
    eq($bridge->checkout(input_request(['payment_method' => 'melli_pay', 'customer_note' => 'first']))->code, 'attempt_changed');
    eq($bridge->checkout(input_request(['payment_method' => 'bacs', 'customer_note' => 'second']))->code, 'attempt_changed');
    eq($GLOBALS['bacs_calls'], 1); eq(count($GLOBALS['http']), 0);
});
test_case('unavailable BACS fails before gateway, bank and durable attempt side effects', function ($bridge) {
    $GLOBALS['bacs_enabled'] = false;
    eq($bridge->checkout(input_request(['payment_method' => 'bacs']))->data['status'], 502);
    eq($GLOBALS['bacs_calls'], 0); eq(count($GLOBALS['http']), 0);
});
test_case('uncertain native transfer cannot re-run stock/cart side effects', function ($bridge) {
    $GLOBALS['bacs_throw'] = true;
    eq($bridge->checkout(input_request(['payment_method' => 'bacs']))->data['order_id'], 55);
    eq($bridge->checkout(input_request(['payment_method' => 'bacs']))->data['order_id'], 55);
    eq($GLOBALS['bacs_calls'], 1);
    $r = new WP_REST_Request(); $r['id'] = 55;
    eq($bridge->order_status($r)->data['payment_state'], 'transfer_processing');
    eq($bridge->order_status($r)->data['bank_transfer'], null);
});
test_case('bank details are owner-only, curated and never run Verify or clear a later cart', function ($bridge) {
    $bridge->checkout(input_request(['payment_method' => 'bacs']));
    $r = new WP_REST_Request(); $r['id'] = 55;
    $status = $bridge->order_status($r)->data;
    eq($status['payment_method'], 'bacs'); eq($status['payment_state'], 'transfer_pending');
    eq($status['bank_transfer']['accounts'][0]['account_number'], '123456');
    check(!str_contains(json_encode($status), 'SECRET'));
    $GLOBALS['user'] = 8; eq($bridge->order_status($r)->data['status'], 404);
    $GLOBALS['user'] = 7; $GLOBALS['orders'][55]->paid = true;
    eq($bridge->refresh_order($r)->data['paid'], true); eq(WC()->cart->clears, 1); eq(count($GLOBALS['http']), 0);
});
test_case('anonymous checkout and order permissions are denied', function ($bridge) {
    $GLOBALS['user'] = 0;
    eq($bridge->authenticated()->data['status'], 401);
    eq($bridge->checkout(input_request())->data['status'], 401);
    eq(count($GLOBALS['http']), 0);
});
test_case('array injection, extra fields and oversized inputs are rejected', function ($bridge) {
    foreach ([['attempt_id' => []], ['expected_total' => []], ['cart_hash' => []], ['payment_method' => 'cod'], ['customer_note' => []], ['customer_note' => str_repeat('x', 1001)], ['attempt_id' => '../x']] as $bad) {
        eq($bridge->checkout(input_request($bad))->data['status'], 400);
    }
    $request = input_request(); $request->body = str_repeat('x', 16385);
    eq($bridge->checkout($request)->data['status'], 400);
    eq(count($GLOBALS['http']), 0);
});
test_case('authenticated requests still require an explicit valid REST nonce', function ($bridge) {
    $request = input_request(); $request->headers = [];
    eq($bridge->authenticated($request)->data['status'], 403);
    eq($bridge->checkout($request)->data['status'], 403);
    eq($GLOBALS['dispatches'], 0);
});
test_case('account checkout rejects Cart-Token transport before dispatching Woo', function ($bridge) {
    $request = input_request(); $request->headers['cart-token'] = 'expired-token';
    eq($bridge->checkout($request)->data['status'], 400);
    $request->headers['cart-token'] = 'signed-token';
    foreach (['8', 't_guest'] as $owner) {
        $GLOBALS['token_user'] = $owner;
        eq($bridge->checkout($request)->data['status'], 400);
    }
    eq($GLOBALS['dispatches'], 0); eq(count($GLOBALS['http']), 0);
    $GLOBALS['token_user'] = '7';
    unset($request->headers['cart-token']);
    eq($bridge->checkout($request)->status, 200);
});
test_case('missing Store API nonce cannot create orders or contact the bank', function ($bridge) {
    $request = input_request(); unset($request->headers['nonce']);
    eq($bridge->checkout($request)->code, 'invalid_store_nonce');
    eq($GLOBALS['dispatches'], 0); eq(count($GLOBALS['http']), 0);
});
test_case('classic/other checkout contexts remain untouched', function ($bridge) {
    $result = new TestPaymentResult();
    $context = (object) ['payment_method' => 'melli_pay', 'order' => $GLOBALS['orders'][55]];
    $bridge->process_payment($context, $result);
    eq($result->status, ''); eq(count($GLOBALS['http']), 0);
});
test_case('direct Sadad URL, exact signature and fixed callback origin', function ($bridge) {
    $response = $bridge->checkout(input_request());
    eq($response->status, 200);
    eq($response->data['redirect_url'], 'https://sadad.shaparak.ir/VPG/Purchase?Token=bank-token-1234567890');
    eq($GLOBALS['bank_request']['Amount'], 2500000);
    $plain = openssl_decrypt($GLOBALS['bank_request']['SignData'], 'des-ede3', str_repeat('a', 24), 0);
    eq($plain, '456;' . $GLOBALS['bank_request']['OrderId'] . ';2500000');
    check(str_starts_with($GLOBALS['bank_request']['ReturnUrl'], 'https://cms.example.test/wp-json/nrh/v1/sadad/callback?'));
});
test_case('same attempt and fresh UUID replay use one order and one bank request', function ($bridge) {
    $first = $bridge->checkout(input_request());
    for ($i = 0; $i < 100; $i++) eq($bridge->checkout(input_request())->data, $first->data);
    eq($bridge->checkout(input_request(['attempt_id' => '11234567-89ab-4cde-8fab-0123456789ab']))->data, $first->data);
    eq($GLOBALS['dispatches'], 1); eq(count($GLOBALS['http']), 1);
});
test_case('attempt cannot be rebound to another cart', function ($bridge) {
    $bridge->checkout(input_request());
    eq($bridge->checkout(input_request(['cart_hash' => str_repeat('b', 64)]))->code, 'attempt_changed');
    eq(count($GLOBALS['http']), 1);
});
test_case('another cart cannot overwrite an unresolved bank payment', function ($bridge) {
    $bridge->checkout(input_request());
    $response = $bridge->checkout(input_request(['attempt_id' => '11234567-89ab-4cde-8fab-0123456789ab', 'cart_hash' => str_repeat('b', 64)]));
    eq($response->data['redirect_url'], 'https://shop.example.test/checkout/result?order=55');
    eq(count($GLOBALS['http']), 1);
});
test_case('cart transfer lock blocks checkout and paid-cart cleanup before side effects', function ($bridge) {
    $GLOBALS['held_cart_lock'] = NRH_Headless_Checkout::session_lock_key('7');
    eq($bridge->checkout(input_request())->data['status'], 409);
    eq($GLOBALS['dispatches'], 0); eq(count($GLOBALS['http']), 0);
    $GLOBALS['held_cart_lock'] = null;
    $bridge->checkout(input_request());
    $bridge->release(); // Finish the first simulated HTTP request, including shutdown.
    $order = $GLOBALS['orders'][55]; $order->paid = true;
    $GLOBALS['held_cart_lock'] = NRH_Headless_Checkout::session_lock_key('7');
    $request = new WP_REST_Request(); $request['id'] = 55;
    eq($bridge->refresh_order($request)->data['status'], 409);
    eq(WC()->cart->clears, 0);
});

test_case('busy database lock never calls checkout or bank', function ($bridge) {
    $GLOBALS['lock_busy'] = true;
    eq($bridge->checkout(input_request())->code, 'payment_busy');
    eq(count($GLOBALS['http']), 0); eq($GLOBALS['dispatches'], 0);
});
test_case('changed total fails closed before contacting bank', function ($bridge) {
    $response = $bridge->checkout(input_request(['expected_total' => '1']));
    eq($response->code, 'checkout_rejected'); eq(count($GLOBALS['http']), 0);
});
test_case('bank timeout and HTTP redirect cannot trigger another payment', function ($bridge) {
    foreach (['timeout', 'redirect'] as $mode) {
        reset_case(); $bridge = $GLOBALS['bridge']; $GLOBALS['bank_mode'] = $mode;
        $response = $bridge->checkout(input_request());
        eq($response->data['redirect_url'], 'https://shop.example.test/checkout/result?order=55');
        $bridge->checkout(input_request());
        eq(count($GLOBALS['http']), 1); eq($GLOBALS['orders'][55]->paid, false);
    }
});
test_case('broken Boom/validation errors stay private and permit a corrected request', function ($bridge) {
    $GLOBALS['core_mode'] = 'boom_error';
    $reply = $bridge->checkout(input_request());
    check(!str_contains(json_encode($reply), 'SECRET'));
    eq($reply->code, 'checkout_unavailable');
    $GLOBALS['core_mode'] = 'success';
    eq($bridge->checkout(input_request())->status, 200);
});
test_case('storage failure prevents any bank traffic', function ($bridge) {
    $GLOBALS['storage_fail'] = true;
    eq($bridge->checkout(input_request())->code, 'checkout_unavailable');
    eq(count($GLOBALS['http']), 0);
});
test_case('order metadata persistence failure prevents contacting bank', function ($bridge) {
    $GLOBALS['meta_storage_fail'] = true;
    eq($bridge->checkout(input_request())->code, 'checkout_rejected');
    eq(count($GLOBALS['http']), 0);
});
test_case('forged token, bank order and callback secret never call Verify', function ($bridge) {
    $bridge->checkout(input_request());
    foreach ([['token' => 'forged-token'], ['OrderId' => '999'], ['token' => []]] as $bad) eq($bridge->callback(callback_request($bad))->code, 'invalid_callback');
    $request = callback_request(); $request->query['key'] = 'wrong';
    eq($bridge->callback($request)->code, 'invalid_callback');
    eq(count($GLOBALS['http']), 1); eq($GLOBALS['orders'][55]->paid, false);
});
test_case('authentic bank callback completes exactly once and redirects to frontend', function ($bridge) {
    $bridge->checkout(input_request());
    $request = callback_request();
    $result = $bridge->callback($request);
    eq($result->status, 303); eq($result->headers['Location'], 'https://shop.example.test/checkout/result?order=55');
    $bridge->callback($request);
    eq($GLOBALS['orders'][55]->completions, 1); eq(count($GLOBALS['http']), 2);
});
test_case('disabling new payments cannot block verification of an existing payment', function ($bridge) {
    $bridge->checkout(input_request()); $GLOBALS['settings']['enabled'] = 'no';
    $bridge->callback(callback_request()); eq($GLOBALS['orders'][55]->paid, true);
});
test_case('mismatched Verify order/amount, missing evidence and timeout never mark paid', function ($bridge) {
    foreach (['wrong_order', 'wrong_amount', 'missing_trace', 'expired', 'timeout'] as $mode) {
        reset_case(); $bridge = $GLOBALS['bridge'];
        $bridge->checkout(input_request()); $GLOBALS['verify_mode'] = $mode;
        $bridge->callback(callback_request());
        eq($GLOBALS['orders'][55]->paid, false);
        eq($GLOBALS['orders'][55]->get_meta('_nrh_sadad_payment')['state'], 'verify_pending');
    }
});
test_case('modified WooCommerce amount cannot be marked paid', function ($bridge) {
    $bridge->checkout(input_request()); $GLOBALS['orders'][55]->total = '1';
    $bridge->callback(callback_request()); eq($GLOBALS['orders'][55]->paid, false); eq(count($GLOBALS['http']), 1);
});
test_case('other customers cannot read or refresh an order', function ($bridge) {
    $bridge->checkout(input_request()); $GLOBALS['user'] = 8;
    $request = new WP_REST_Request('GET'); $request['id'] = 55;
    eq($bridge->order_status($request)->data['status'], 404);
    eq($bridge->refresh_order($request)->data['status'], 404);
});
test_case('paid status is authoritative and contains no bank credentials or callback secrets', function ($bridge) {
    $bridge->checkout(input_request()); $bridge->callback(callback_request());
    $request = new WP_REST_Request('GET'); $request['id'] = 55;
    $response = $bridge->order_status($request);
    eq($response->data['paid'], true); eq($response->data['reference'], '987654');
    $json = json_encode($response->data);
    foreach (['token', 'terminal_key', 'callback', 'merchant_id'] as $word) check(!str_contains($json, $word));
});
test_case('cart cleanup preserves a cart changed after payment', function ($bridge) {
    $bridge->checkout(input_request()); $bridge->callback(callback_request());
    $request = new WP_REST_Request('POST'); $request['id'] = 55;
    $GLOBALS['wc']->cart->hash = 'new-cart';
    $bridge->refresh_order($request); eq($GLOBALS['wc']->cart->clears, 0);
    $GLOBALS['wc']->cart->hash = 'original-cart';
    $bridge->refresh_order($request); eq($GLOBALS['wc']->cart->clears, 1);
});
test_case('verification refresh is throttled and ordinary GET never calls the bank', function ($bridge) {
    $bridge->checkout(input_request()); $GLOBALS['verify_mode'] = 'timeout';
    $request = new WP_REST_Request('POST'); $request['id'] = 55;
    $bridge->refresh_order($request); $bridge->refresh_order($request);
    for ($i = 0; $i < 100; $i++) $bridge->order_status($request);
    eq(count($GLOBALS['http']), 2);
});
test_case('exact rial conversion rejects rounding and overflow', function () {
    eq(NRH_Headless_Checkout::rial_amount('1.5', 'IRT'), 15);
    eq(NRH_Headless_Checkout::rial_amount('100.00', 'IRR'), 100);
    eq(NRH_Headless_Checkout::rial_amount('2', 'IRHT'), 20000);
    foreach ([['1.1', 'IRR'], ['-1', 'IRT'], ['0', 'IRR'], ['9999999999999999', 'IRT'], ['1', 'USD']] as $bad) {
        $threw = false;
        try { NRH_Headless_Checkout::rial_amount(...$bad); } catch (RuntimeException $error) { $threw = true; }
        check($threw);
    }
});
test_case('private routes disable caching and referrer leakage', function ($bridge) {
    $response = $bridge->no_cache(new WP_REST_Response(), null, new WP_REST_Request());
    eq($response->headers['Cache-Control'], 'private, no-store, max-age=0');
    eq($response->headers['Referrer-Policy'], 'no-referrer');
    // The live site's existing public nrh/v1/filters endpoint keeps its own cache policy.
    $public = $bridge->no_cache(new WP_REST_Response(), null, new WP_REST_Request('GET', '/nrh/v1/filters'));
    eq($public->headers, []);
});

test_case('NRH orders cannot bypass bound verification using the legacy Sadad callback or receipt', function ($bridge) {
    eq($bridge->checkout(input_request())->status, 200);
    $before = count($GLOBALS['http']); $query = $_GET;
    try {
        $_GET['wc_order'] = '55';
        foreach ([null, '', 55] as $id) {
            try { $bridge->guard_legacy_payment($id); throw new RuntimeException('legacy bypass allowed'); }
            catch (RuntimeException $error) { eq($error->getCode(), 403); }
        }
        eq(count($GLOBALS['http']), $before); check(!$GLOBALS['orders'][55]->is_paid());
        unset($GLOBALS['orders'][55]->meta['_nrh_sadad_payment']);
        $bridge->guard_legacy_payment(55); // Traditional non-NRH orders remain outside this flow.
    } finally { $_GET = $query; }
});
reset_case();
$bridge = $GLOBALS['bridge']; $bridge->checkout(input_request());
$request = new WP_REST_Request('GET'); $request['id'] = 55;
$times = [];
for ($i = 0; $i < 2000; $i++) {
    $start = hrtime(true); $bridge->order_status($request); $times[] = (hrtime(true) - $start) / 1e6;
}
sort($times);
$metrics = ['scope' => 'PHP adapter with in-memory WordPress/WooCommerce doubles, not live database/bank performance', 'samples' => count($times), 'status_p95_ms' => $times[(int) floor(count($times) * .95)], 'status_bank_calls' => count($GLOBALS['http']) - 1];
echo json_encode(['passed' => $GLOBALS['passed'], 'failed' => $GLOBALS['failed'], 'performance' => $metrics], JSON_PRETTY_PRINT) . "\n";
exit($GLOBALS['failed'] > 0 ? 1 : 0);
