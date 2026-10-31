<?php
/**
 * Plugin Name: NRH Headless Checkout
 * Description: Authenticated WooCommerce Store API checkout with Sadad and native bank transfer.
 * Version: 1.4.0
 * Requires at least: 6.9
 * Requires PHP: 8.1
 * Requires Plugins: woocommerce
 */
defined('ABSPATH') || exit;

require_once __DIR__ . '/includes/class-nrh-headless-checkout.php';
require_once __DIR__ . '/includes/class-nrh-cart-session.php';
require_once __DIR__ . '/includes/class-nrh-cart-lock.php';
require_once __DIR__ . '/includes/class-nrh-account-lock.php';

add_action('plugins_loaded', static function () {
    $supported = defined('WC_VERSION') && version_compare(WC_VERSION, '10.7.0', '>=') &&
        class_exists(WC_Session_Handler::class) &&
        class_exists(\Automattic\WooCommerce\StoreApi\Utilities\CartTokenUtils::class) &&
        class_exists(\Automattic\WooCommerce\StoreApi\Utilities\CartController::class) &&
        class_exists(\Automattic\WooCommerce\StoreApi\Utilities\QuantityLimits::class) &&
        class_exists(\Automattic\WooCommerce\Checkout\Helpers\ReserveStock::class);
    if ($supported) {
        $checkout = new NRH_Headless_Checkout();
        $checkout->register();
        (new NRH_Cart_Session($checkout))->register();
        (new NRH_Cart_Lock())->register();
        (new NRH_Account_Lock($checkout))->register();
    } else {
        add_action('admin_notices', static function () {
            echo '<div class="notice notice-error"><p>' . esc_html('NRH Headless Checkout requires WooCommerce 10.7 or later with the standard Store API and session handler. Its API is disabled until this dependency is available.') . '</p></div>';
        });
    }
}, 20);

add_action('before_woocommerce_init', static function () {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});
