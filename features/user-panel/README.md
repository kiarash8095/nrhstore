# User panel

Persian account UI at `/account`, built around the existing Boom customer APIs. All feature code, contracts, transport, hooks, components, and tests live here. The former `features/account` greeting-only feature is replaced by this feature; `/dashboard` redirects to `/account`.

## Structure

- `index.ts`: client integration surface (`FavoriteButton`, `CheckoutSavedAddresses`).
- `server.ts`: server integration surface (`UserPanelPage`, `accountHandler`).
- `contracts.ts`: validated input/output contracts and DTOs.
- `api/user-panel.api.ts`: same-origin client transport and identity checks.
- `hooks/use-user-panel.ts`: session-scoped TanStack queries and serialized writes.
- `server/handlers.ts`: fixed route allowlist, authentication, CSRF checks, bounds, cache rejection, rate limiting, and upstream transport.
- `server/normalize.ts`: curated public DTOs and plain-text normalization.
- `components/`: shell, sidebar, dashboard, orders/details, favorites, addresses, dynamic profile, contact support, and checkout integration.
- `constants/contact.ts`: company contact details, including `info@nrh.ir` as confirmed by the owner.
- `tests/`: handler/security tests and isolated browser integration.

The files in `app` only connect routes to this feature. Shared authentication and cart/session locks remain owned by their existing features. Store chrome visibility is a shared layout concern.

## Routes

`/account`, `/account/orders`, `/account/orders/:id`, `/account/wishlist`, `/account/addresses`, `/account/profile`, `/account/support`.

`/account/cart` displays the active account cart through the existing cart feature's query, item controls, pending-transfer/error states and Woo totals. No separate cart store or pricing logic is introduced in the panel.

Each server-rendered private page calls `requireUser()`. An absent or invalid session redirects to the existing authentication flow and retains the intended account path. The client also hides stale account UI after logout or a change of identity. Each API request verifies the encrypted session on the server; browser-supplied identity hints never authorize access.

## Extracted WordPress contracts

Discovered from the live `https://nrhstore.ir/wp-json` index and the public Boom account client on 2026-10-27. Boom publishes no request args for these routes, so the body and response shapes below follow its own account client. No authenticated live account writes were performed during implementation.

| Next route                              | WordPress route                                               | Method / body                                                           |
| --------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `/api/account/orders?page=N`            | `/boom/v1/my-orders?page=N&per_page=10`                       | GET                                                                     |
| `/api/account/orders/:id`               | `/boom/v1/my-orders/:id`                                      | GET                                                                     |
| `/api/account/stats`                    | `/boom-wallet/v1/balance`                                     | GET; only completed/cancelled/refunded counts are returned to the panel |
| `/api/account/wishlist`                 | `/boom/v1/wishlist`                                           | GET; POST `{ product_id }`                                              |
| `/api/account/wishlist/:id`             | `/boom/v1/wishlist/:id`                                       | DELETE                                                                  |
| `/api/account/wishlist/products?page=N` | Wishlist IDs, then public `/wc/store/v1/products?include=...` | GET; public catalog prices/images only                                  |
| `/api/account/addresses`                | `/boom/v1/addresses`                                          | GET; POST address body                                                  |
| `/api/account/addresses/:id`            | `/boom/v1/addresses/:id`                                      | PUT address body; DELETE                                                |
| `/api/account/addresses/:id/default`    | `/boom/v1/addresses/:id/default`                              | POST `{}`                                                               |
| `/api/account/profile`                  | `/boom/v1/profile-fields`                                     | GET; POST `{ values: { configuredField: value } }`                      |

Address body: `title`, `first_name`, `last_name`, `state`, `city`, `address`, `postcode`, `phone`. Ownership/IDs are never accepted from form data. Boom remains responsible for final ownership checks in its customer-only endpoints. If an order response includes a customer ID, the adapter additionally checks it; detail response IDs must also match the requested order.

Profile forms follow the fields configured in WordPress. Privilege/session fields are filtered out; login phone fields remain read-only and are preserved from the verified server response. Unsupported file fields remain read-only. Existing password recovery handles password changes. No new password or phone-change endpoint is invented.

Per the owner's clarification, support contains company address, phone and email; there is no ticket subsystem. There is no wallet UI or invented credit/balance. Order searching/filtering explicitly applies to the current page. Order currencies use the response currency; the store catalog currency is the fallback when Boom omits it.

The heart control on product pages persists to the same wishlist. Saved addresses can prefill checkout, where the customer must review and save them before proceeding. The payment result links to the matching panel order detail.

## Security and checks

Private API responses use `private, no-store`; upstream reads add unpredictable cache-busters and reject cache hits/aged responses. WordPress cookies and REST nonce stay server-side. Routes, IDs, pagination, methods, request sizes and dynamic profile fields are constrained. Writes preflight bridge 1.3's authenticated `/nrh/v1/capabilities`, then require `X-NRH-Account-Lock: mysql-v1` acknowledgement. WordPress holds the same database account lock as cart/merge/checkout through session persistence. This applies on every host; no writable Next lock directory or VERCEL-specific branch is required. Lost writes are not replayed. Origin is derived from the configured WordPress server; policy failures do not automatically expire a valid login. See [deployment requirements](../../docs/purchase-readiness-fa.md).

Exclude `/api/account/*`, `/account/*`, the used Boom customer endpoints and authenticated statistics from WordPress/CDN caches. Existing deployment requirements for shared persistent session/lock storage still apply.

Commands:

```text
npm run test:user-panel
npm run test:user-panel:browser
npm run typecheck
npm run lint
npm run build
```

Browser testing uses the installed Playwright runtime via `PLAYWRIGHT_MODULE`. It starts an isolated Next server and substitutes a local WordPress backend only in that test process. This transport is never imported by application code. `USER_PANEL_TEST_MODE=production` runs the built app; default is development. Reports/screenshots are saved to `artifacts/user-panel/<mode>/`. Real login, address/profile writes and wishlist changes should also be verified with a dedicated real customer account before release.

Verified on 2026-10-27: production build, TypeScript and targeted ESLint; 77 passing security/integration tests across account/auth/cart/payments; production browser flows for all panel sections, anonymous authentication redirect, two-account isolation, invalid/error/retry paths, duplicate submission, logout/revocation and a 390px mobile layout. Checkout browser regression also passes, including saved-address prefill with explicit confirmation, shipping, coupons, bank logo/redirect and the final order-detail link. Both browser suites use controlled backends; the bank destination is intercepted.

Reviewed again on 2026-10-28: 79 passing security/integration tests, production build/TypeScript/targeted ESLint, and the extended production browser suite. Order screens now refresh automatically every 30 seconds while visible and offer explicit refresh; polling stops on errors. Custom order statuses, Persian/Arabic order-number searches, readable province names, empty tracking and unconfirmed payment messages, out-of-range pagination, and orders with their own currency during a catalog outage are covered. Editable forms are not polled.

The browser suite now creates one controlled order through the real Next cart/checkout handlers, opens it in the account panel, and checks status/tracking changes through delivery and cancellation/failure/refund states. `USER_PANEL_ORDER_PRODUCT_FILE` optionally supplies a public catalog snapshot for that order; it does not enable live mutations. Live WordPress checkout endpoints were absent and the configured test-account login returned 401. The owner explicitly selected controlled testing for this review. See [REVIEW.md](REVIEW.md) for evidence and scope. Changing order status or tracking remains a WordPress administrator responsibility; customers can only view and refresh their own orders.
