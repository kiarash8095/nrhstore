# Headless WordPress Integration

## Status

The frontend owns public product/category URLs, HTML, metadata and sitemap. WordPress/WooCommerce remain the catalog source. This phase implements the catalog BFF, category lookup, pagination, canonical product URLs, SEO and signed catalog invalidation. It is **not** a completed checkout or production migration.

No DNS, live WordPress settings, existing products, orders, secrets or payment configuration were changed.

## Deployment

Run this app as a Next.js Node.js service, not a static SPA export or a WordPress theme ZIP. WordPress can remain on PHP hosting. Both services may run on one server or on separate hosts.

Example topology:

```text
nrhstore.ir          -> Next.js Node.js service
cms.nrhstore.ir      -> WordPress/PHP and WooCommerce
cms.nrhstore.ir/wp-admin -> existing store administration
```

`cms.nrhstore.ir` is an example, not an origin provisioned by this change. Configure TLS and a reverse proxy/hosting router before changing public traffic. Existing banner files and auth revocations need persistent storage; multi-instance deployment needs shared storage and coordinated caches.

## Environment

Set deployment environment variables, using `.env.example` as the reference:

```dotenv
NEXT_PUBLIC_SITE_URL=https://nrhstore.ir
WP_API_URL=https://cms.nrhstore.ir/wp-json
WP_AUTH_BASE_URL=https://cms.nrhstore.ir/wp-json
SITE_INDEXING_ENABLED=false
WP_WEBHOOK_SECRET=replace-with-a-random-secret-of-at-least-32-characters
```

- `NEXT_PUBLIC_SITE_URL` is the public frontend origin, without a path.
- `WP_API_URL` is the WordPress REST root, without `/wc/store/v1`.
- Until WordPress actually moves, keep the backend URL on the current WordPress origin. Do not point it at the frontend after DNS cutover unless a deliberate `/wp-json` reverse proxy exists.
- Existing `NEXT_PUBLIC_BASE_URL` installations remain supported as a server-side fallback. Browser catalog requests now use `/api/catalog`; they no longer need the WordPress origin or cross-origin session cookies.
- Keep the existing auth/session secrets and Boom plugin configuration. Auth remains dependent on those WordPress endpoints; a WordPress login cookie is not a substitute for the existing BFF session checks.
- Keep `SITE_INDEXING_ENABLED=false` in development and staging. Explicitly set it to `true` and rebuild **only after** launch validation. This changes root robots metadata and robots.txt.
- Use separate staging configuration; protect staging with access controls as well as noindex. Never put administrative API keys or session secrets in `NEXT_PUBLIC_` variables.
- Keep old image URLs working. The image allowlist accepts the current media origin and the configured WordPress origin. Subdirectory installations/custom media hosts need their own explicit image configuration.

## API Boundaries

`/api/catalog/[...path]` is a read-only, allowlisted catalog proxy. It does not forward browser Cookie or Authorization headers to WordPress and does not accept private customers, settings, arbitrary URLs, or write operations. Pagination headers are preserved and errors are sanitized.

The server-only WooCommerce client uses bounded timeouts, a configured backend origin and catalog cache tags. Server and browser catalog modules are separated so backend configuration cannot enter the browser's module graph.

Cart endpoints use a separate session-aware, uncached BFF with HttpOnly Cart-Tokens. Cart UI and checkout preparation are implemented in Next.js. Guest-to-account merge and successful checkout draft creation still depend on fixes to Boom PHP; see `features/cart/README.md` for exact live findings. No final payment is performed.

## URLs and SEO

- Public products use `/products/{slug}`. Numeric product URLs permanently redirect to the canonical slug after looking up the product.
- `/product/{slug}` permanently redirects to `/products/{slug}`.
- `/product-category/{slug}` redirects to the new category route. Hierarchical legacy category paths resolve their final category slug before redirecting.
- Category lookup comes from paginated WordPress taxonomy data instead of a five-item ID map.
- Catalog/category pagination uses `?page=n`, ordinary links and self-referencing canonicals.
- Metadata is exported by App Router route entries; feature-specific metadata/schema lives with its feature.
- Product schema uses real prices, stock and reviews. Toman is converted to IRR using the API minor-unit field. Unknown/zero prices are not advertised as a paid offer.
- Sitemap contains only implemented public URLs and nonempty categories, with no fabricated modification dates. Do not replace the old sitemap until blog, brand and other legacy URLs are mapped or implemented.
- Root canonical is not inherited by every page. Login/query-string UI states do not become separate canonical home URLs.
- Missing products/categories use Next.js `notFound()` and its noindex metadata. In an already-streamed response, Next.js can return HTTP 200 with the Not Found UI rather than a wire-level 404; this was observed in the browser smoke test. Validate rendered robots metadata as well as status codes when crawling the staging site.

## Signed WooCommerce Webhooks

In WooCommerce webhook settings, configure product-created, product-updated and product-deleted events to POST to:

```text
https://nrhstore.ir/api/catalog/revalidate
```

Use the same random secret as `WP_WEBHOOK_SECRET`. The handler verifies WooCommerce's base64 HMAC-SHA256 `X-WC-Webhook-Signature` against the original request bytes and rejects unconfigured/unsigned requests. Payload size is bounded. No public arbitrary-path invalidation endpoint is provided.

The current `max` cache profile marks catalog entries stale; the next reader can receive stale content while background refresh runs. The 300-second catalog TTL is a fallback. **Checkout must always revalidate prices/stock server-side rather than trust cached catalog amounts.** Category changes need equivalent signed invalidation or the fallback TTL.

## Release Gates Still Required

1. Complete and test cart operations, guest-to-customer merge, customer order ownership, checkout and order confirmation.
2. Verify the exact Iranian gateway plugin's headless support, backend callback/verification endpoint and return URL. Never infer a successful payment from browser query parameters.
3. Complete/map existing blog, brand and remaining public pages. Inventory all old URLs and prevent redirect loops/chains or redirects of unrelated pages to home.
4. Keep APIs, gateway callbacks/webhooks, wp-admin, cron and media accessible as needed. Restrict/index-control the backend's HTML pages, not its entire host indiscriminately.
5. Normalize frontend links in WordPress-generated emails and backend redirect responses. A backend `permalink` is not automatically the desired frontend URL.
6. Decide where banner management/data belongs; its existing Next.js file-backed administration has not been migrated into WordPress.
7. Verify existing Search Console ownership, compare the old/new crawl, test production HTML and rendered content, validate structured data, run mobile performance tests and then enable indexing.
8. Back up WordPress/database/media, keep a rollback plan, and monitor 404/5xx, redirects, indexing and checkout after cutover.

## Verification

```sh
npm run test:headless
npm run test:auth
npm run typecheck
npm run build
```

Headless tests mock the upstream API and do not create live carts, accounts, orders or payments. Live smoke tests should be read-only until an approved payment sandbox is available.

The production build currently retains the pre-existing broad filesystem-tracing warning from banner storage. Resolve/review that packaging concern and persistent-storage configuration before production hosting.
