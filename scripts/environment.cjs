/* eslint-disable @typescript-eslint/no-require-imports -- Node setup and readiness command. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const { loadEnvConfig } = require('@next/env');
const { parseEnv } = require('node:util');
const { ConfigurationError, validateBuildEnvironment, validateRuntimeEnvironment, BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS } = require('../lib/server/runtime-config.cjs');

// Match Next/dotenv's CRLF and legacy CR parsing without rewriting stored values.
const parseSettings = text => parseEnv(text.replace(/\r\n?/g, '\n'));

// Explicit development setup only. Production never invents or rotates secrets.
async function prepareDevelopmentEnvironment(root, suppliedEnv = {}) {
  const target = path.join(root, '.env.local');
  const lock = target + '.setup.lock';
  let handle;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { handle = await fs.open(lock, 'wx', 0o600); break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      await delay(50);
    }
  }
  if (!handle) throw new Error('Environment setup is already running. If it was interrupted, remove .env.local.setup.lock after stopping the other setup process.');
  let temporary;
  try {
    let text;
    try { text = await fs.readFile(target, 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      text = (await fs.readFile(path.join(root, '.env.example'), 'utf8'))
        .replace(/^NEXT_PUBLIC_SITE_URL=.*$/m, 'NEXT_PUBLIC_SITE_URL=http://localhost:3000');
    }
    const defaults = {
      AUTH_SESSION_SECRET: () => randomBytes(32).toString('hex'),
      BANNERS_ADMIN_USERNAME: () => BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.username,
      BANNERS_ADMIN_PASSWORD: () => BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.password,
      BANNERS_ADMIN_SESSION_SECRET: () => randomBytes(32).toString('hex'),
    };
    let updated = text;
    for (const [name, createValue] of Object.entries(defaults)) {
      // Horizontal whitespace only: \s can consume the LF of CRLF and join a key to a comment.
      const match = updated.match(new RegExp('^[\\t ]*(?:export[\\t ]+)?' + name + '[\\t ]*=([^\\r\\n]*)', 'm'));
      const value = parseSettings(updated)[name];
      // Preserve explicit credentials (including invalid values) and higher-priority env sources.
      if (value?.trim() || suppliedEnv[name]?.trim()) continue;
      const comment = match?.[1].match(/(?:^|[\t ]+)(#.*)$/)?.[1];
      const line = name + '=' + createValue() + (comment ? ' ' + comment : '');
      updated = match ? updated.replace(match[0], () => line) : updated.trimEnd() + '\n' + line + '\n';
    }
    if (updated === text) return false;
    const provided = Object.fromEntries(Object.entries(suppliedEnv).filter(([, value]) => typeof value === 'string' && value.trim()));
    const candidate = { ...parseSettings(updated), ...provided };
    if (candidate.NODE_ENV === 'production') throw new Error('Automatic environment setup is only allowed for local development.');
    // Validate the complete candidate before writing, so an invalid explicit value leaves the file intact.
    validateRuntimeEnvironment({ env: candidate, production: false });
    temporary = target + '.' + randomUUID() + '.tmp';
    await fs.writeFile(temporary, updated, { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, target);
    temporary = undefined;
    return true;
  } finally {
    if (temporary) await fs.unlink(temporary).catch(() => {});
    await handle.close();
    await fs.unlink(lock);
  }
}

async function checkStorage(root, env = process.env) {
  const banners = env.BANNERS_DATA_DIR || 'data/banners';
  for (const directory of [env.AUTH_SESSION_DATA_DIR || 'data/auth', env.CART_LOCK_DIR || 'data/cart-locks', banners, path.join(banners, 'images')]) {
    const resolved = path.resolve(root, directory);
    await fs.mkdir(resolved, { recursive: true, mode: 0o700 });
    const probe = path.join(resolved, '.write-check-' + randomUUID());
    try { await fs.writeFile(probe, '', { flag: 'wx', mode: 0o600 }); }
    finally { await fs.unlink(probe).catch(() => {}); }
  }
}

async function checkBackend(config) {
  const headers = { Accept: 'application/json', 'Cache-Control': 'no-cache, no-store' };
  const indexResponse = await fetch(config.authApiUrl, { headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!indexResponse.ok) throw new Error('WordPress authentication REST namespace is unavailable (HTTP ' + indexResponse.status + ').');
  const index = await indexResponse.json();
  const routes = Object.keys(index.routes || {});
  for (const endpoint of ['/send-otp', '/verify-otp', '/sync-session', '/me', '/logout']) {
    if (!routes.some(route => route.endsWith(endpoint))) throw new Error('WordPress authentication endpoint is missing: ' + endpoint);
  }
  const cartUrl = config.wordpressApiUrl + '/wc/store/v1/cart?_nrh_request=' + randomUUID();
  const response = await fetch(cartUrl, { headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('WooCommerce cart is unavailable (HTTP ' + response.status + ').');
  const cart = await response.json();
  if (!Array.isArray(cart.items) || !cart.totals || !response.headers.get('Cart-Token')) throw new Error('WooCommerce did not issue a valid cart session.');
  if (/hit/i.test(response.headers.get('X-LiteSpeed-Cache') || response.headers.get('CF-Cache-Status') || '')) throw new Error('WooCommerce cart was served from a shared cache. Exclude private cart and authentication endpoints from caching.');
}

async function main() {
  const root = process.cwd();
  const building = process.argv.includes('--build');
  let production = building || process.argv.includes('--production') || process.env.NODE_ENV === 'production';
  const setup = process.argv.includes('--setup');
  const logger = { info() {}, error() { console.error('[environment] Could not load an environment file. Check its syntax.'); } };
  loadEnvConfig(root, !production, logger);
  production ||= process.env.NODE_ENV === 'production';
  if (production && setup) throw new Error('Automatic environment setup is only allowed for local development.');
  if (building) {
    validateBuildEnvironment();
    console.log('[environment] Build configuration is ready. Private session secrets and writable storage are checked when the server starts.');
    return;
  }
  if (setup) {
    if (await prepareDevelopmentEnvironment(root, process.env)) console.log('[environment] Saved missing development settings in .env.local. Existing credentials and session keys were preserved.');
    loadEnvConfig(root, true, logger, true);
  }
  const config = validateRuntimeEnvironment({ production });
  await checkStorage(root);
  console.log('[environment] Session configuration and writable storage are ready (' + (production ? 'production' : 'development') + ').');
  console.log('[environment] Banner administrator is configured. Local development defaults are documented in features/banners/README.md; production requires private credentials.');
  if (process.argv.includes('--network')) {
    await checkBackend(config);
    console.log('[environment] Real WordPress auth routes and WooCommerce guest sessions are reachable. No SMS was sent and no item was added.');
  }
}

module.exports = { prepareDevelopmentEnvironment, checkStorage, checkBackend };
if (require.main === module) main().catch(error => {
  console.error('[environment] ' + (error instanceof ConfigurationError ? error.message : error.message || 'Readiness check failed.'));
  process.exitCode = 1;
});
