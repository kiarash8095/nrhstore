# Banner administration

Persian learning guide: [بنرهای خانه و پنل مدیریت](D:/Projects2/nrh_store_nextjs/docs/banners-learning-fa.md).

Open `/banners-admin`. Unauthenticated requests redirect to `/banners-admin/login`.
This administrator is independent of the store's customer/WordPress login.

## Local setup

Set these server-only values in `.env.local`, then restart `npm run dev`:

```dotenv
BANNERS_ADMIN_USERNAME=admin
BANNERS_ADMIN_PASSWORD=<a unique password of at least 12 characters>
BANNERS_ADMIN_SESSION_SECRET=<a random secret of at least 32 characters>
```

Generate a secret with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Missing or weak configuration disables login. Sessions use an HttpOnly,
SameSite=Strict cookie, expire after eight hours, and use Secure in production.
Changing the username, password or secret invalidates existing sessions. Mutation
endpoints verify both the session and request origin. Login attempts are limited
per IP and globally in memory; multiple server instances need a shared limiter.

## Editing

The panel covers all six banner sections on the home page. Replace images, edit
titles, add or remove banners and change their order within each section.
Removing every banner in a section hides that section. Restore rolls back the
current draft to the last saved version. Navigation away from unsaved changes
prompts the browser's usual warning on reload/close.

JPG, PNG and WebP files up to 5 MiB are decoded and converted to WebP on the
server. Animated and oversized images are rejected. Uploading a file prepares it;
the site's published configuration changes only after **ذخیره تغییرات**.
Success and failure are shown in a toast. Failed saves retain the draft. A
revision check rejects saves from an outdated tab instead of overwriting newer
changes. On session expiry, log in in another tab and retry to retain your draft.

Saved changes are visible immediately on new page requests. Open tabs in the same
browser update via BroadcastChannel/storage events. Other visible browsers check
every five seconds and on window focus. No site rebuild is required.

## Public banner presentation

Home banners use consistent cards with uncropped artwork, readable captions and
internal catalog/category links. Bundled creatives have destinations in
`utils/banner-presentation.ts`; new uploads default to `/products`. Custom titles
are preserved, while generic original labels get readable display captions. This
does not add a destination field to the editor or rewrite the saved document.

The main slider has previous/next buttons, slide selection and a rotation control.
Automatic rotation defaults to six seconds, pauses on hover, and stops after
focus or a drag until explicitly restarted. It skips advances off screen or in a
hidden tab. Reduced-motion preference disables initial autoplay and uses an
SSR-consistent media-query snapshot; an explicit play request can enable rotation.
Inactive slide links are inert. Images retain their aspect ratio. Large previous/
next controls sit at the image's two edges; captions, slide selection and rotation
controls have a separate area below it.

## Storage and deployment

The default directory is `data/banners/` and can be overridden by
`BANNERS_DATA_DIR` (an absolute directory is recommended on a server). It contains
`banners.json` and `images/`. Back up both and retain them between deployments.
The initial twelve existing banners are used until the first save. Saves use a
file lock and atomic rename; if a process crashes while saving, stop all server
processes and remove a leftover `save.lock` before restarting.

Removing a banner removes it from the published configuration; uploaded files
are retained so open tabs and drafts remain valid. Unused uploads can be cleaned
up offline after confirming they are not referenced by saved or in-progress drafts.

This adapter is intended for local development or a Node server with persistent
disk. Before deploying to serverless hosting, replace the filesystem store with
a shared database and object storage; ephemeral disks will not retain uploads.
For multiple Node instances, all instances need the same storage directory.
The credentials and runtime data are excluded from Git. If `.env.local` was
already tracked before this feature, `.gitignore` does not untrack it: keep secret
changes out of commits.

## Verification

With the local server running, run `node features/banners/tests/banners.integration.cjs` for
authentication, authorization, upload validation, publication, persistence and
revision conflict checks. `features/banners/tests/banners.browser.cjs` additionally exercises the
editor and live home-page synchronization using Playwright. Install Playwright
for that optional check, or point `BANNERS_PLAYWRIGHT_MODULE` at an existing
installation. Both tests temporarily change the local published configuration
and restore the original configuration in their cleanup; run them against a
development instance without concurrent editing. `BANNERS_TEST_URL` overrides
the default `http://localhost:3000`.

`npm run test:banners:public:browser` uses the same Playwright module setting and
local server to check public navigation, autoplay controls, focus, reduced motion,
responsive widths and empty/single-slide refreshes. It uses browser response
fixtures and never edits the published banner document. Previews and its report
are saved to `artifacts/banners`.
