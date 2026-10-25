<?php
/**
 * Plugin Name: NRH Headless Checkout
 * Description: Authenticated WooCommerce Store API checkout with direct Sadad payment.
 * Version: 1.1.1
 * Requires PHP: 8.1
 * Requires Plugins: woocommerce
 */
defined('ABSPATH') || exit;

require_once __DIR__ . '/includes/class-nrh-headless-checkout.php';
require_once __DIR__ . '/includes/class-nrh-cart-session.php';

add_action('plugins_loaded', static function () {
    if (class_exists('WooCommerce')) {
        $checkout = new NRH_Headless_Checkout();
        $checkout->register();
        (new NRH_Cart_Session($checkout))->register();
    }
}, 20);

add_action('before_woocommerce_init', static function () {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});
