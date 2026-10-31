<?php
require __DIR__ . '/fixtures/lock-runtime.php';
$passed = 0; $failed = 0;
function check($value, $message = 'assertion failed') { if (!$value) throw new RuntimeException($message); }
function eq($actual, $expected) { check($actual === $expected, var_export($actual, true) . ' != ' . var_export($expected, true)); }
function test_case($name, $test) {
    global $passed, $failed;
    $GLOBALS['woo'] = new TestWoo(); $GLOBALS['wpdb'] = new TestDb(); $GLOBALS['events'] = [];
    $GLOBALS['hooks'] = []; $GLOBALS['user'] = 0; $GLOBALS['guest'] = 't_' . str_repeat('a', 32); $GLOBALS['save_fails'] = false; $GLOBALS['silent_save_fails'] = false;
    $_SERVER['HTTP_CART_TOKEN'] = 'signed-token';
    $lock = new NRH_Cart_Lock();
    try { $test($lock, new WP_REST_Request()); $passed++; echo "PASS $name\n"; }
    catch (Throwable $error) { $failed++; echo "FAIL $name: {$error->getMessage()}\n"; }
    finally { $lock->release(); }
}
test_case('acquires before Woo loads; saves before acknowledgement; releases only after shutdown', function ($lock, $request) {
    $lock->register(); eq($GLOBALS['hooks']['rest_pre_dispatch'][1], -100);
    eq($GLOBALS['hooks']['shutdown'][1], PHP_INT_MAX);
    eq($lock->acquire(null, null, $request), null);
    $key = NRH_Headless_Checkout::session_lock_key($GLOBALS['guest']);
    check(isset($GLOBALS['wpdb']->held[$key]));
    WC()->session = new TestSession($GLOBALS['guest']);
    $response = $lock->response(new WP_REST_Response(), null, $request);
    eq($response->headers['X-NRH-Cart-Lock'], 'mysql-v1');
    check(str_contains($response->headers['Cache-Control'], 'no-store'));
    check(isset($GLOBALS['wpdb']->held[$key])); // A second request cannot read unsaved data.
    check(in_array(['save'], $GLOBALS['events'], true));
    $shutdown = $GLOBALS['hooks']['shutdown'][0]; $shutdown();
    eq($GLOBALS['wpdb']->held, []); eq(end($GLOBALS['events']), ['release', $key]);
    $count = count($GLOBALS['events']); $lock->release(); eq(count($GLOBALS['events']), $count);
});
test_case('competing request cannot acquire the same guest lock before session persistence finishes', function ($lock, $request) {
    eq($lock->acquire(null, null, $request), null);
    $other = new NRH_Cart_Lock();
    eq($other->acquire(null, null, new WP_REST_Request())->code, 'cart_busy');
    $lock->release();
    eq($other->acquire(null, null, new WP_REST_Request()), null); $other->release();
});
test_case('silent native session write failure cannot return a success acknowledgement', function ($lock, $request) {
    eq($lock->acquire(null, null, $request), null);
    WC()->session = new TestSession($GLOBALS['guest']); $GLOBALS['silent_save_fails'] = true;
    $response = $lock->response(new WP_REST_Response(), null, $request);
    eq($response->status, 503); eq($response->data['code'], 'cart_save_failed');
    check(!isset($response->headers['X-NRH-Cart-Lock']));
});
test_case('database and site prefixes isolate server-wide MySQL lock names', function () {
    $GLOBALS['wpdb']->prefix = 'site_a_'; $a = NRH_Headless_Checkout::session_lock_key('7');
    $GLOBALS['wpdb']->prefix = 'site_b_'; $b = NRH_Headless_Checkout::session_lock_key('7');
    check($a !== $b); check(strlen($a) <= 64); check(strlen($b) <= 64);
});
test_case('account uses exactly the checkout/merge lock and clears cached user/session data', function ($lock, $request) {
    $GLOBALS['user'] = 7; unset($request->headers['cart-token'], $_SERVER['HTTP_CART_TOKEN']); $request->headers['x-wp-nonce'] = 'valid-wp-nonce';
    eq($lock->acquire(null, null, $request), null);
    check(isset($GLOBALS['wpdb']->held[NRH_Headless_Checkout::session_lock_key('7')]));
    check(in_array(['cache', 7, 'user_meta'], $GLOBALS['events'], true));
    check(in_array(['cache', 'prefix_7', WC_SESSION_CACHE_GROUP], $GLOBALS['events'], true));
    WC()->session = new TestSession('7');
    eq($lock->response(new WP_REST_Response(), null, $request)->status, 200);
});
test_case('invalid signatures, account Cart-Tokens and missing WP nonces never authorize a lock', function ($lock, $request) {
    $request->headers['cart-token'] = $_SERVER['HTTP_CART_TOKEN'] = 'forged'; eq($lock->acquire(null, null, $request)->code, 'invalid_cart_token');
    $request->headers['cart-token'] = $_SERVER['HTTP_CART_TOKEN'] = 'signed-token'; $GLOBALS['guest'] = '7';
    eq($lock->acquire(null, null, $request)->code, 'invalid_cart_token');
    unset($request->headers['cart-token'], $_SERVER['HTTP_CART_TOKEN']); $GLOBALS['user'] = 7;
    eq($lock->acquire(null, null, $request)->code, 'rest_cookie_invalid_nonce'); eq($GLOBALS['wpdb']->held, []);
});
test_case('initial guest GET can bootstrap; guest mutations cannot invent a competing session', function ($lock, $request) {
    unset($request->headers['cart-token'], $_SERVER['HTTP_CART_TOKEN']); $request->method = 'POST';
    eq($lock->acquire(null, null, $request)->code, 'cart_session_required');
    $request->method = 'GET'; eq($lock->acquire(null, null, $request), null); eq($GLOBALS['wpdb']->held, []);
    WC()->session = new TestSession($GLOBALS['guest']);
    eq($lock->response(new WP_REST_Response(), null, $request)->headers['X-NRH-Cart-Lock'], 'mysql-v1');
});
test_case('early session/cart loading and nested cart requests fail without a false acknowledgement', function ($lock, $request) {
    WC()->session = new TestSession($GLOBALS['guest']);
    eq($lock->acquire(null, null, $request)->code, 'cart_session_loaded_early');
    WC()->session = null; WC()->cart = new stdClass();
    eq($lock->acquire(null, null, $request)->code, 'cart_session_loaded_early');
    WC()->cart = null; eq($lock->acquire(null, null, $request), null);
    eq($lock->acquire(null, null, new WP_REST_Request())->code, 'cart_session_loaded_early');
});
test_case('busy DB, wrong identity, missing session and persistence failures do not acknowledge success', function ($lock, $request) {
    $GLOBALS['wpdb']->busy = true; eq($lock->acquire(null, null, $request)->code, 'cart_busy');
    $GLOBALS['wpdb']->busy = false; eq($lock->acquire(null, null, $request), null);
    eq($lock->response(new WP_REST_Response(), null, $request)->status, 503);
    WC()->session = new TestSession('wrong'); eq($lock->response(new WP_REST_Response(), null, $request)->status, 503);
    WC()->session = new TestSession($GLOBALS['guest']); $GLOBALS['save_fails'] = true;
    $failed = $lock->response(new WP_REST_Response(), null, $request);
    eq($failed->data['code'], 'cart_save_failed'); check(!isset($failed->headers['X-NRH-Cart-Lock']));
    check(str_contains($failed->headers['Cache-Control'], 'no-store'));
});
test_case('an internal subrequest cannot lock a different token from the outer HTTP session', function ($lock, $request) {
    unset($_SERVER['HTTP_CART_TOKEN']);
    eq($lock->acquire(null, null, $request)->code, 'invalid_cart_transport'); eq($GLOBALS['wpdb']->held, []);
    $error = $lock->response(new WP_REST_Response(['code' => 'invalid_cart_transport'], 403), null, $request);
    check(str_contains($error->headers['Cache-Control'], 'no-store'));
    check(!isset($error->headers['X-NRH-Cart-Lock']));
});
test_case('unrelated/non-protocol requests and upstream failures retain their normal behavior', function ($lock, $request) {
    unset($request->headers['x-nrh-cart-lock']); eq($lock->acquire(null, null, $request), null);
    $request->headers['x-nrh-cart-lock'] = 'mysql-v1'; $request->route = '/wc/store/v1/products';
    eq($lock->acquire(null, null, $request), null); eq($GLOBALS['events'], []);
    $request->route = '/wc/store/v1/cart'; $prior = new WP_Error('prior', 'prior', ['status' => 403]);
    eq($lock->acquire($prior, null, $request), $prior);
    eq($lock->acquire(null, null, $request), null);
    $error = $lock->response(new WP_REST_Response(['code' => 'out_of_stock'], 409), null, $request);
    eq($error->data['code'], 'out_of_stock'); check(!isset($error->headers['X-NRH-Cart-Lock']));
});
echo json_encode(['passed' => $passed, 'failed' => $failed, 'environment' => 'WordPress/Woo/DB protocol doubles; no real database or bank'], JSON_PRETTY_PRINT) . "\n";
exit($failed ? 1 : 0);

