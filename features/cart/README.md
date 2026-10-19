# Cart and checkout preparation

Persian learning guide: [راهنمای کوتاه ساخت سبد خرید](D:/Projects2/nrh_store_nextjs/docs/cart-learning-fa.md).

WooCommerce is the source of truth. TanStack Query holds the latest full cart response; no cart items, prices, discounts or totals are persisted or calculated in localStorage/Zustand.

## Flow and ownership

- Product purchase supports simple products and the site's real variation attributes/IDs.
- Successful adds show a product-specific toast and open the accessible left drawer. Escape, close and backdrop dismiss it.
- Drawer and /cart share query data, server quantity limits, removal, images and row totals.
- /cart includes coupons, clear confirmation, an order summary and related product suggestions.
- /checkout stays in Next.js. It saves billing/shipping addresses through Store API, selects available shipping rates, reviews the same cart and requests checkout draft preparation. It does not process payment or submit a final order.
- All navigation uses frontend product/cart/checkout URLs. Backend permalinks are mapped to local routes.
- Cart routes are allowlisted handlers under app/api/cart delegating to features/cart/server. Inputs are bounded, validated with Zod and checked for same-origin browser requests.
- Tokens stay in HttpOnly, SameSite=Lax cookies (Secure in production), never in JSON or browser storage. Account sessions are verified through the auth feature's server-only bridge; tokens have separate guest/account cookie namespaces.
- Reads are paused during serialized mutations; successful responses replace the exact session query. 409 cart snapshots reconcile stale data. Lost mutation responses are not blindly retried. BroadcastChannel invalidates other tabs.
- Web Locks coordinate browser tabs; exclusive files serialize each cart across Node workers sharing `CART_LOCK_DIR` (default `data/cart-locks`). Active locks never expire: after a crash stop all workers before removing stale lock files. Independent disks require shared lock storage.
- Only GET bootstraps cart cookies. Only the explicit pre-write `cart_session_required` rejection permits bootstrap and one new attempt. Client identity hints reject actions from an older login and are never authorization credentials. Cart responses do not rewrite auth cookies.
- Quantity +/- reads the latest WooCommerce quantity inside the browser lock. Checkout confirmation is tied to the current identity, address and cart. See `docs/race-condition-fixes-fa.md` for fresh regression results.
- Recommendations use public catalog requests and exclude cart products.

## Current backend findings (2026-10-19)

Live tests found that LiteSpeed serves cached GET /wc/store/v1/cart responses, including stale initial tokens, despite Cache-Control: no-store. The cart transport sends explicit no-cache headers and an unguessable per-request GET parameter and rejects a reported cache hit. **Exclude cart, checkout and customer/session endpoints from all WordPress/CDN caches before production.** Public catalog caching remains separate.

Live GET /wc/store/v1/checkout fails with HTTP 500:
Boom/inc/cart-sync.php -> ensure_user_logged_in_for_checkout() calls
Automattic\WooCommerce\StoreApi\SessionHandler::set_customer_session_cookie(),
which does not exist. This must be repaired in PHP for Store API compatibility. Internal API responses sanitize the failure and never expose PHP paths/stack traces.

Guest-to-account merge is deliberately pending until the actual Boom sync-cart/sync-session PHP contract is supplied. A nonempty guest cart is preserved after login and remains editable, with an explicit synchronization notice; checkout preparation is blocked rather than silently losing items or attaching an order to the wrong identity. No guessed sync-cart payload or frontend merge has been introduced.

The live test product 1659 reports needs_shipping=false from WooCommerce. A shipping-rate success path cannot be validated live when the backend provides no rates; mock integration tests cover rate forwarding. A valid coupon was not supplied, so live coupon tests cover rejection and mocked tests cover successful application/removal.

## Checks

- npm run test:cart — mocked request lifecycle, security, token rotation/isolation, quantity controls, conflict/error handling and checkout preparation.
- npm run test:cart:live — use an isolated guest session against the local BFF and real WordPress; cleans up the cart. It records backend checkout blockers separately.
- npm run test:cart:browser — desktop/mobile flow, toast, drawer, quantities, reload persistence, checkout address, error handling and local navigation. Requires Playwright available via PLAYWRIGHT_MODULE and optionally PLAYWRIGHT_CHANNEL.
- npm run typecheck, npm run lint, npm run test:auth, npm run test:headless, npm run build.

CART_TEST_BASE_URL defaults to http://localhost:3000. WP_API_URL is the REST root. Browser/live checks intentionally perform no payment, SMS or account creation. Output/screenshot reports are written to artifacts/cart (not credentials).

Before enabling final payment, supply the Boom merge implementation, repair the checkout PHP hook and verify the exact payment gateway's Store API contract, callbacks and order ownership. Payment must remain verified by WooCommerce.
