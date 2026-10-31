# Cart and checkout preparation

Persian learning guide: [راهنمای کوتاه ساخت سبد خرید](D:/Projects2/nrh_store_nextjs/docs/cart-learning-fa.md).

WooCommerce is the source of truth. TanStack Query holds the latest full cart response; no cart items, prices, discounts or totals are persisted or calculated in localStorage/Zustand.

## Flow and ownership

- Product purchase supports simple products and the site's real variation attributes/IDs.
- Successful adds show a product-specific toast and open the accessible left drawer. Escape, close and backdrop dismiss it.
- Drawer and /cart share query data, server quantity limits, removal, images and row totals.
- /cart includes coupons, clear confirmation, an order summary and related product suggestions.
- /checkout stays in Next.js. It saves billing/shipping addresses through Store API, selects shipping and requires login for final payment. POST /api/cart/pay validates the cart snapshot and calls the WordPress bridge for Sadad or native WooCommerce BACS checkout. Payment method and optional customer note are bound to the request UUID. BACS/note support is checked before creating an order. See docs/headless-checkout-sadad-fa.md for setup and live verification requirements.
- Checkout has separate address/shipping (`/checkout`) and payment (`/checkout?step=payment`) stages, with shared progress navigation, independent address/shipping/payment components, a coupon field and read-only order review. Advancing stages never starts an order. Address confirmation is bound to the current session and server address; reloading requires confirmation again. The two supported radio choices are Bank Melli (`melli_pay`) followed by direct bank transfer (`bacs`), subject to native availability. The primary action says «پرداخت» or «ثبت سفارش» respectively. Optional notes appear last, and the privacy dialog shares its content with `/privacy-policy`. Native WooWallet cashback is informational only. See `docs/checkout-v140-fa.md`.
- All navigation uses frontend product/cart/checkout URLs. Backend permalinks are mapped to local routes.
- Cart routes are allowlisted handlers under app/api/cart delegating to features/cart/server. Inputs are bounded, validated with Zod and checked for same-origin browser requests.
- Guest Cart-Tokens stay in HttpOnly, SameSite=Lax cookies (Secure in production), never in JSON or browser storage. Verified account requests use WordPress cookies and separate WP/Store API nonces without Cart-Token. Old account token cookies are ignored. The Store API User-ID must match the authenticated account before a write.
- Reads are paused during serialized mutations; successful responses replace the exact session query. 409 cart snapshots reconcile stale data. Lost mutation responses are not blindly retried. BroadcastChannel invalidates other tabs.
- Web Locks coordinate browser tabs; exclusive files serialize each cart across Node workers sharing `CART_LOCK_DIR` (default `data/cart-locks`). Active locks never expire: after a crash stop all workers before removing stale lock files. Independent disks require shared lock storage.
- Only GET bootstraps guest cart cookies. Only the explicit pre-write `cart_session_required` rejection permits bootstrap and one new attempt. Client identity hints reject actions from an older login and are never authorization credentials. Cart responses do not rewrite auth cookies. Following login, the client sends one explicit POST /api/cart/sync when a guest cart is pending; only successful account readback retires the guest cookie.
- Quantity +/- reads the latest WooCommerce quantity inside the browser lock. Checkout confirmation is tied to the current identity, address and cart. See `docs/race-condition-fixes-fa.md` for fresh regression results.
- Recommendations use public catalog requests and exclude cart products.

## Current backend findings (2026-10-19)

Live tests found that LiteSpeed serves cached GET /wc/store/v1/cart responses, including stale initial tokens, despite Cache-Control: no-store. The cart transport sends explicit no-cache headers and an unguessable per-request GET parameter and rejects a reported cache hit. **Exclude cart, checkout and customer/session endpoints from all WordPress/CDN caches before production.** Public catalog caching remains separate.

The previous live GET /wc/store/v1/checkout failed with HTTP 500:
Boom/inc/cart-sync.php -> ensure_user_logged_in_for_checkout() calls
Automattic\WooCommerce\StoreApi\SessionHandler::set_customer_session_cookie(),
which does not exist. The 2026-10-22 fix avoids selecting this token session handler for authenticated requests and uses Woo's standard cookie session instead. Boom's encrypted source and security hooks are untouched. This fix is covered by controlled tests; real installed-theme compatibility still needs verification. Internal API responses never expose PHP paths/stack traces.

Bridge 1.3 supplies authenticated POST /nrh/v1/cart/merge with one-time summed quantities for matching keys. It validates Woo quantity/product/stock rules, preserves variation/extension data and rehydrates through WC_Cart_Session. Replay evidence is part of the same session snapshot before Woo hooks can save. Guest data is retired only after account persistence; conflicts preserve both carts. An authenticated capabilities preflight rejects older replacement semantics before writing. No Boom sync-cart payload is guessed.

The live test product 1659 reports needs_shipping=false from WooCommerce. A shipping-rate success path cannot be validated live when the backend provides no rates; mock integration tests cover rate forwarding. A valid coupon was not supplied, so live coupon tests cover rejection and mocked tests cover successful application/removal.

## Checks

On every host, the BFF delegates cart serialization to the WordPress MySQL connection locks. `X-NRH-Cart-Lock: mysql-v1` is required on successful Store API responses. The initial GET refuses a missing coordinator before mutation. Locks span session loading through shutdown persistence and are shared with panel writes, merge, checkout and paid-cart cleanup. Production cart/account/payment flows need no local lock directory, process memory mutex or VERCEL-specific switch. Install bridge 1.3 **before** deploying this Next update. `/account/cart` reuses the same cart query, item controls and Woo totals. See [purchase readiness](../../docs/purchase-readiness-fa.md).

- npm run test:cart — mocked request lifecycle, security, token rotation/isolation, quantity controls, conflict/error handling and checkout preparation.
- npm run test:cart:live — use an isolated guest session against the local BFF and real WordPress; cleans up the cart and verifies guest checkout is rejected before creating a draft.
- npm run test:cart:browser — desktop/mobile flow, toast, drawer, quantities, reload persistence, checkout address, error handling and local navigation. Requires Playwright available via PLAYWRIGHT_MODULE and optionally PLAYWRIGHT_CHANNEL.
- npm run typecheck, npm run lint, npm run test:auth, npm run test:headless, npm run build.

CART_TEST_BASE_URL defaults to http://localhost:3000. WP_API_URL is the REST root. Browser/live checks intentionally perform no payment, SMS or account creation. Output/screenshot reports are written to artifacts/cart (not credentials).

The wordpress/nrh-headless-checkout bridge processes the melli_pay and bacs Store API contexts, verifies bound Sadad transactions server-side, delegates BACS to the native gateway, and supplies the guest/account transfer endpoint. Before live use, install/configure version 1.4.0 and verify login, transfer and payment against the actual WordPress/database/bank environment. Local controlled tests do not certify the live gateway.
