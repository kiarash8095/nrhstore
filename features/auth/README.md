# WordPress customer authentication

Persian learning guide: [ورود، بازیابی رمز و نشست مشتری](D:/Projects2/nrh_store_nextjs/docs/auth-learning-fa.md).

Audited against `https://nrhstore.ir/wp-json/`, the site's public Boom JavaScript and the installed Next.js 16.2.12 documentation on 2026-10-13. Customer authentication is separate from the banner administrator at `/banners-admin`.

## Actual upstream requests

Base URL: `https://nrhstore.ir/wp-json/boom/v1`. Bodies are JSON. The REST index lists routes but does not declare their body fields, so these fields were checked against the site's client and live requests.

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| POST | `/send-otp` | `{ phone }` | Send a four-digit SMS code |
| POST | `/verify-otp` | `{ phone, otp }` | Consume an SMS code and establish a WordPress session |
| POST | `/login` | `{ username, password }` | Login with an existing username, email or phone |
| POST | `/register` | `{ name, phone, email, password }` | Create an account; email is required |
| POST | `/sync-session` | None; authenticated cookies and nonce | Synchronize the WordPress/WooCommerce session |
| GET | `/me` | None; authenticated cookies and nonce | Fetch the actual logged-in WordPress user |
| POST | `/logout` | None; authenticated cookies and nonce | Request backend logout |
| POST | `/reset-password` | `{ phone, otp, password }` | Consume the SMS code and change the password |
| POST | `/forgot-password-email` | `{ email }` | Request an email recovery code |
| POST | `/reset-password-email` | `{ email, code, password }` | Consume a six-digit email code and change the password |

There is no `check-phone`, `/auth/*` prefix or refresh endpoint in this namespace. Registration is explicit; the UI never fabricates a phone-existence result. Phone numbers use `09xxxxxxxxx`; Persian/Arabic digits and common Iranian international formats are normalized before validation.

SMS password recovery must send the code directly to `/reset-password` with the new password. Calling `/verify-otp` first consumes the code and logs in, leaving no code for the reset request.

## Session and authorization

The browser calls `/api/auth/*` on this Next.js application. `features/auth/server/backend` owns the upstream requests; credentials and WordPress cookies never go into localStorage, React state or public environment variables. Login, signup and OTP verification must obtain backend cookies, synchronize the session and validate `/me` before returning an authenticated response. A backend `success: false`, missing cookies or missing numeric user ID cannot create a session.

WordPress REST cookie authentication also requires `X-WP-Nonce`. The server obtains it from the authenticated core action `GET /wp-admin/admin-ajax.php?action=rest-nonce`, then supplies it on REST requests. Without it WordPress treats the request as anonymous even when valid cookies exist. An expired nonce is renewed once. See [WordPress cookie authentication](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/) and [the core nonce action](https://developer.wordpress.org/reference/functions/wp_ajax_rest_nonce/).

The Next.js cookie contains the upstream cookie jar, nonce, random local session ID and expiry, encrypted and authenticated with AES-256-GCM. It excludes Boom's untrusted `me` profile cookie and contains no password. The cookie is `HttpOnly`, `SameSite=Lax`, has a bounded lifetime and is always `Secure` in production. Modified, unsigned, expired and pre-migration cookies are rejected. Rotating `AUTH_SESSION_SECRET` invalidates existing local sessions.

WordPress remains the authority for identity and backend session validity. Next.js also stores local session revocations on persistent disk because the live audit showed that the Boom logout response could leave a previous cookie usable. Every encrypted version retains the same local session ID. Logout persists its revocation before clearing the browser cookie, even if the backend logout request fails. Revocations are checked in both the session API and DAL. Storage failures fail closed and cannot report a successful logout. A successful password reset also revokes the requesting local session; invalidating other WordPress sessions remains the backend's responsibility.

`proxy.ts` only redirects when a session cookie is absent. It is not an authorization boundary. `/dashboard` uses `requireUser()` in `features/auth/server/dal.ts`, which checks revocation and verifies the backend user. Add the same DAL check to each future private page, Route Handler or Server Action, and check ownership/permissions again before reading or changing private resources. Hiding a client component is insufficient. The current customer DTO does not grant administrator permissions; banner administration has its own server-side guard.

The implementation follows the installed [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication): server-only session code, async `cookies()`, checks close to data, safe DTOs and a per-render cached DAL. Authentication responses use `private, no-store`; redirects accept only local paths. Strict body schemas, an 8 KiB streaming limit, same-origin checks and server-side request limits protect the BFF. Backend errors are mapped to safe messages; raw passwords, codes and cookies are not logged. Backend outages preserve an existing browser session rather than pretending that logout succeeded.

## Local setup and hosting

Keep `.env.local` outside Git. It is now ignored and untracked, while the local file remains. Use `.env.example` as the configuration reference.

<<<<<<< HEAD
`npm run dev` now runs a development preflight: a missing local session secret is generated once and saved privately, existing settings are preserved, and restarts reuse the same key. `npm run setup:env` runs this separately; `npm run doctor` checks configuration, writable storage and the real WordPress/WooCommerce endpoints without sending SMS or adding products. Production build/start require explicit stable secrets and an HTTPS frontend origin and never generate keys. Missing configuration is rejected before sending OTP, with a safe `configuration_error` response instead of a late generic 500.

=======
>>>>>>> 5ac6dc77aee4b7ce44d07237d793f692485c06b6
```dotenv
WP_AUTH_BASE_URL=https://nrhstore.ir/wp-json
WP_AUTH_NAMESPACE=boom/v1
WP_AUTH_TIMEOUT_MS=10000
AUTH_SESSION_SECRET=<random secret of at least 32 characters>
AUTH_SESSION_MAX_AGE=1209600
AUTH_SESSION_DATA_DIR=<optional absolute persistent directory>
AUTH_ALLOWED_ORIGINS=
```

Generate the secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Never add a `NEXT_PUBLIC_` prefix. Production requires HTTPS.

Local revocations live in `data/auth/revoked` by default; filenames are validated random UUIDs and content is only an expiry timestamp. Preserve that directory across restarts. Expired records can be removed after their timestamp; never remove active records. If reducing the maximum session lifetime, rotate the encryption secret so older cookies cannot outlive their revocation records.

This storage and the in-memory request limiter are intended for the current local/single-server deployment. Before deploying to multiple instances or an ephemeral/serverless host, replace revocations and rate-limit buckets with a shared persistent database/Redis store. A reverse proxy must overwrite `X-Forwarded-For`; never trust a browser-supplied forwarding header. WordPress's public endpoints also need backend rate limits; Next.js cannot protect requests sent directly to WordPress.

## Verification

<<<<<<< HEAD
Fresh real OTP, cookie, authenticated-cart, browser reload and logout verification for 2026-10-19 is recorded in [production readiness](D:/Projects2/nrh_store_nextjs/docs/production-readiness-fa.md). `npm run test:auth:live` is an explicit opt-in live test using `AUTH_LIVE_TEST_PHONE` and an interactively supplied SMS code; it removes only its test item and logs out its test session. It performs no payment or password reset and stores no codes, cookies or contact details in its report.

=======
>>>>>>> 5ac6dc77aee4b7ce44d07237d793f692485c06b6
```bash
npm run test:auth
npm run typecheck:auth
npx eslint features/auth app/api/auth "app/(account)/dashboard" proxy.ts
```

The 20 isolated security tests replace upstream fetches with controlled fixtures. They cover encryption/tampering/expiry, actual request fields, nonce renewal, strict validation, CSRF, unsafe redirects, brute-force limits, concurrent SMS cooldown, non-enumerating email recovery, password reset consumption, backend outages, DAL authorization, persistent logout revocation and revocation storage failures. The test loader's `server-only`/cookie substitutions exist only in the Node test process.

Browser tests require Playwright and Edge plus a running development server:

```bash
# If Playwright is already available elsewhere, point to that module instead of installing it.
AUTH_PLAYWRIGHT_MODULE=/absolute/path/to/playwright npm run test:auth:browser
```

`AUTH_TEST_URL` defaults to `http://localhost:3000`. Optionally set `AUTH_LIVE_COOKIE_FILE` to a private file containing a legitimately issued local cookie pair. That test logs out and revokes the supplied session. Never use a production session without the owner's authorization. Recovery UI tests use mocked responses and send no SMS/email.

Live checks performed with the owner's permission: four-digit SMS login, account creation with a separate test email alias, password login, duplicate-email rejection, backend identity verification, dashboard access/reload, real logout and rejection of a replayed cookie. The live test account remains available; its local credentials use `AUTH_AUDIT_TEST_EMAIL`, `AUTH_AUDIT_TEST_PASSWORD` and `AUTH_AUDIT_TEST_PHONE` in `.env.local`. No credentials or personal contact details are embedded in these tests or this document.

Email recovery returned a successful upstream response, but the owner did not receive the message. A real email password reset is therefore **not verified**. It requires WordPress mail/SMTP logs or the Boom plugin source to diagnose delivery. No successful live SMS password reset is claimed either: the supplied phone already belongs to the owner's original account, whose password was preserved. Reset request contracts and both UI paths pass isolated tests.

The focused auth typecheck and the 20 security tests passed after the feature-based migration. Cart API routes have since been implemented with WooCommerce Store API and TanStack Query; the guest/account merge, PHP checkout compatibility and final payment dependencies are documented in `features/cart/README.md`. See `docs/README.md` for the complete Persian learning path. Test results here describe earlier verification, not a fresh run for the documentation update.
