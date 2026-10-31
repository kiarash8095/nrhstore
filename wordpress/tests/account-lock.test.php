<?php
require __DIR__ . '/fixtures/lock-runtime.php';
require __DIR__ . '/../nrh-headless-checkout/includes/class-nrh-account-lock.php';
$passed = 0; $failed = 0;
function check($value, $message = 'assertion failed') { if (!$value) throw new RuntimeException($message); }
function eq($actual, $expected) { check($actual === $expected, var_export($actual, true) . ' != ' . var_export($expected, true)); }
function test_case($name, $test) {
    global $passed, $failed;
    $GLOBALS['woo'] = new TestWoo(); $GLOBALS['wpdb'] = new TestDb(); $GLOBALS['events'] = []; $GLOBALS['hooks'] = [];
    $GLOBALS['user'] = 7; $GLOBALS['save_fails'] = false; unset($_SERVER['HTTP_CART_TOKEN']);
    $request = new WP_REST_Request(); $request->route = '/boom/v1/profile-fields'; $request->method = 'POST';
    $request->headers = ['x-nrh-account-lock' => 'mysql-v1', 'x-wp-nonce' => 'valid-wp-nonce'];
    $lock = new NRH_Account_Lock(new NRH_Headless_Checkout());
    try { $test($lock, $request); $passed++; echo "PASS $name\n"; }
    catch (Throwable $error) { $failed++; echo "FAIL $name: {$error->getMessage()}\n"; }
    finally { $lock->release(); }
}
test_case('capability discovery is authenticated, private and advertises sum/DB coordination', function ($lock, $request) {
    $r = $lock->capabilities($request); eq($r->data['version'], '1.4.0'); eq($r->data['checkout'], 'bank-and-bacs-v1'); eq($r->data['cart_merge'], 'sum-v1'); eq($r->data['account_lock'], 'mysql-v1');
    check(str_contains($r->headers['Cache-Control'], 'no-store')); eq($GLOBALS['wpdb']->held, []);
    $GLOBALS['user'] = 0; eq($lock->capabilities($request)->data['status'], 401);
});
test_case('all account mutations use the same cart/payment lock and fresh metadata', function ($lock, $request) {
    foreach (['/boom/v1/profile-fields', '/boom/v1/wishlist', '/boom/v1/wishlist/12', '/boom/v1/addresses', '/boom/v1/addresses/101', '/boom/v1/addresses/101/default'] as $route) {
        $guard = new NRH_Account_Lock(new NRH_Headless_Checkout()); $request->route = $route;
        eq($guard->acquire(null, null, $request), null);
        check(isset($GLOBALS['wpdb']->held[NRH_Headless_Checkout::session_lock_key('7')]));
        check(in_array(['cache', 7, 'user_meta'], $GLOBALS['events'], true));
        eq($guard->response(new WP_REST_Response(), null, $request)->headers['X-NRH-Account-Lock'], 'mysql-v1'); $guard->release();
    }
});
test_case('account mutation excludes concurrent cart access and checkout until shutdown', function ($lock, $request) {
    $lock->register(); eq($lock->acquire(null, null, $request), null);
    $other = new NRH_Account_Lock(new NRH_Headless_Checkout()); eq($other->acquire(null, null, $request)->code, 'account_busy');
    $cart = new WP_REST_Request(); $cart->headers = ['x-nrh-cart-lock' => 'mysql-v1', 'x-wp-nonce' => 'valid-wp-nonce'];
    $guard = new NRH_Cart_Lock(); eq($guard->acquire(null, null, $cart)->code, 'cart_busy');
    $key = NRH_Headless_Checkout::session_lock_key('7');
    WC()->session = new TestSession('7');
    eq($lock->response(new WP_REST_Response(), null, $request)->status, 200); check(in_array(['save'], $GLOBALS['events'], true));
    check(isset($GLOBALS['wpdb']->held[$key])); $shutdown = $GLOBALS['hooks']['shutdown'][0]; $shutdown(); eq($GLOBALS['wpdb']->held, []);
});
test_case('missing login/nonce and Cart-Token cannot bypass account identity', function ($lock, $request) {
    $GLOBALS['user'] = 0; eq($lock->acquire(null, null, $request)->data['status'], 401);
    $GLOBALS['user'] = 7; unset($request->headers['x-wp-nonce']); eq($lock->acquire(null, null, $request)->data['status'], 403);
    $request->headers['x-wp-nonce'] = 'valid-wp-nonce'; $request->headers['cart-token'] = 'signed-token';
    eq($lock->acquire(null, null, $request)->code, 'invalid_account_transport'); eq($GLOBALS['wpdb']->held, []);
});
test_case('early session loading and database contention fail before callback work', function ($lock, $request) {
    WC()->session = new TestSession('7'); eq($lock->acquire(null, null, $request)->code, 'account_session_loaded_early');
    WC()->session = null; $GLOBALS['wpdb']->busy = true; eq($lock->acquire(null, null, $request)->code, 'account_busy'); eq($GLOBALS['wpdb']->held, []);
});
test_case('failed/surprising sessions and upstream errors cannot acknowledge successful coordination', function ($lock, $request) {
    eq($lock->acquire(null, null, $request), null);
    $r = $lock->response(new WP_REST_Response([], 409), null, $request); check(!isset($r->headers['X-NRH-Account-Lock']));
    WC()->session = new TestSession('8'); eq($lock->response(new WP_REST_Response(), null, $request)->status, 503);
    WC()->session = new TestSession('7'); $GLOBALS['save_fails'] = true; $r = $lock->response(new WP_REST_Response(), null, $request);
    eq($r->status, 503); check(str_contains($r->headers['Cache-Control'], 'no-store')); check(!isset($r->headers['X-NRH-Account-Lock']));
});
test_case('unrelated and non-protocol endpoints remain untouched', function ($lock, $request) {
    $request->route = '/boom/v1/send-otp'; eq($lock->acquire(null, null, $request), null); eq($GLOBALS['events'], []);
    $request->route = '/boom/v1/profile-fields'; unset($request->headers['x-nrh-account-lock']);
    eq($lock->acquire(null, null, $request), null); eq($GLOBALS['events'], []);
});
echo json_encode(['passed' => $passed, 'failed' => $failed, 'environment' => 'WordPress/Woo/MySQL protocol doubles; no real account writes'], JSON_PRETTY_PRINT) . "\n";
exit($failed ? 1 : 0);
