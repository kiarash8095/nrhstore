# Project Architecture

Persian learning path: [راهنماهای فارسی پروژه](D:/Projects2/nrh_store_nextjs/docs/README.md).

Application code is organized by feature at the repository root. Next.js route files remain in `app/` and delegate to feature implementations. Route groups `(store)`, `(account)` and `(admin)` do not change public URLs; they share the existing root layout.

## Ownership

| Directory | Responsibility |
| --- | --- |
| `features/auth` | Customer login, registration, recovery, sessions and WordPress auth integration |
| `features/cart` | WooCommerce-backed cart UI, session-aware BFF, shared queries and checkout preparation |
| `features/products` | Product cards, sections, details, gallery, ratings, queries and skeletons |
| `features/categories` | Category navigation, lists, detail pages, queries and skeletons |
| `features/search` | Search state, desktop field, mobile dialog and result queries |
| `features/banners` | Public banners, admin UI, admin sessions, image uploads and persistence |
| `features/home` | Home page composition and home-only product sections |
| `features/account` | Customer dashboard composition |

A feature creates only the subdirectories it needs: `components`, `api`, `server`, `hooks`, `store`, `schemas`, `types`, `services`, `storage`, `constants`, `utils` and `tests`. Technical feature documentation lives in its own `README.md`; the Persian learning guides are indexed in `docs/README.md`. Cart operations are implemented; guest/account merge and final checkout/payment still have backend dependencies.

## Public Interfaces

- Import reusable UI and browser hooks from `@/features/<name>`.
- Import server implementations from `@/features/<name>/server`; these entry points enforce `server-only`.
- Neutral contracts and proxy-safe configuration can have explicit `contracts` and `config` entry points.
- Use internal modules freely inside their owning feature. Imports from another feature must use a public entry point. ESLint enforces this boundary.
- The home and account features compose other features. Product features do not depend on home page composition.
- Framework entry points in `app/api` delegate directly to the owning feature's HTTP handler. Route configuration such as `runtime` and `dynamic` remains statically declared in the route file.
- Metadata and Next.js icon conventions remain in `app`.

## Shared Code

`components/ui`, `components/common`, `hooks`, `utils` and `lib` contain generic code and cannot import business features. `components/layout`, `providers` and `app` are composition layers and can use feature interfaces.

The shared HTTP and WooCommerce transports live in `lib/http` and `lib/woocommerce`. Cart DTOs belong to `features/cart/types`, while the shared request limiter lives in `lib/server`. QueryClient configuration has a single owner in `lib/query-client.ts`. Global CSS lives in `styles/globals.css`, and shadcn's `components.json` points there. Static resources live in `public`.

Component filenames use PascalCase. Hooks use `use-*.ts`; other code files and directories use kebab-case, with Next.js convention files retaining their required names.

## Checks

Run `npm run typecheck`, `npm run lint`, `npm run test:auth` and `npm run build` from the repository root. Auth tests live in `features/auth/tests`. Banner integration and browser tests live in `features/banners/tests` and require a running local server and their documented test configuration.

Cart API routes now delegate to the WooCommerce-backed cart feature. Guest/account sessions, cart mutations, coupons, address/shipping updates and checkout preparation share one TanStack Query cart. See `features/cart/README.md` for the remaining PHP merge/checkout blockers and live cache findings.

Historical migration verification included the production build, TypeScript, auth security tests and HTTP smoke checks. The cart was still a placeholder at that stage; later cart and provider tests supersede that status. These are recorded results, not fresh test execution for this documentation update. See the Persian testing guide for current commands and limitations.

The carousel lint issue was subsequently fixed. A banner file-tracing warning remains in the recorded build findings. Cart browser tests use an external Playwright runtime through PLAYWRIGHT_MODULE; reports and screenshots are saved under artifacts/cart.
