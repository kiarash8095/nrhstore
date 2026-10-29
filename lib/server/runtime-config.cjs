// Never import this module from client components. Values are never logged here.
class ConfigurationError extends Error {
  /** @param {string} variable @param {string} message */
  constructor(variable, message) {
    super(`${variable}: ${message}`);
    this.name = 'ConfigurationError';
    this.variable = variable;
  }
}

// Public, documented credentials for local development only. Never accepted in production.
const BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS = Object.freeze({
  username: 'admin',
  password: 'BannersDev123!',
});

/** @param {{env?: NodeJS.ProcessEnv, production?: boolean}} [options] */
function validateBannerAdminEnvironment({ env = process.env, production = env.NODE_ENV === 'production' } = {}) {
  const username = env.BANNERS_ADMIN_USERNAME;
  const password = env.BANNERS_ADMIN_PASSWORD;
  const secret = env.BANNERS_ADMIN_SESSION_SECRET;
  if (!username || username.length > 100 || username !== username.trim() || /[\u0000-\u001f\u007f]/.test(username)) {
    throw new ConfigurationError('BANNERS_ADMIN_USERNAME', 'set a nonempty administrator username of at most 100 characters. Run npm run setup:env for local development.');
  }
  if (!password || password.length < 8 || password.length > 256) {
    throw new ConfigurationError('BANNERS_ADMIN_PASSWORD', 'set an administrator password of 8 to 256 characters. Run npm run setup:env for local development; provision private credentials on the production server.');
  }
  if (!secret || secret.trim().length < 32) {
    throw new ConfigurationError('BANNERS_ADMIN_SESSION_SECRET', 'set a persistent random secret of at least 32 characters. Local setup generates it once; production must provision its own secret.');
  }
  if (production && (password === BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.password || /^<[^>]*>$/.test(password))) {
    throw new ConfigurationError('BANNERS_ADMIN_PASSWORD', 'the documented development password is disabled in production. Configure a private production password before npm run start.');
  }
  if (production && (/^(?:<[^>]*>$|change.?me|replace|your.?secret|example|test.?secret|development)/i.test(secret) || new Set(secret).size < 8)) {
    throw new ConfigurationError('BANNERS_ADMIN_SESSION_SECRET', 'use a cryptographically random secret, not a placeholder or repeated text.');
  }
  return { username, password, secret };
}

/** @param {NodeJS.ProcessEnv} [env] */
function getAuthSessionSecret(env = process.env) {
  const value = env.AUTH_SESSION_SECRET;
  if (!value || value.trim().length < 32) {
    throw new ConfigurationError('AUTH_SESSION_SECRET', 'must contain at least 32 characters. Run npm run setup:env for local development, or configure a persistent secret on the production host.');
  }
  return value;
}

/** @param {string} name @param {string} value @param {boolean} production @param {boolean} [allowLoopbackHttp] */
function parseUrl(name, value, production, allowLoopbackHttp = false) {
  let url;
  try { url = new URL(value); }
  catch { throw new ConfigurationError(name, 'must be an absolute HTTP(S) URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new ConfigurationError(name, 'must be an HTTP(S) URL without credentials, query parameters, or fragments.');
  }
  const loopback = allowLoopbackHttp && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (production && url.protocol !== 'https:' && !loopback) {
    throw new ConfigurationError(name, 'HTTPS is required in production.');
  }
  return url;
}

// Compilation must work before a host injects its private runtime secrets.
/** @param {{env?: NodeJS.ProcessEnv}} [options] */
function validateBuildEnvironment({ env = process.env } = {}) {
  const site = parseUrl('NEXT_PUBLIC_SITE_URL', env.NEXT_PUBLIC_SITE_URL || 'https://nrhstore.ir', false);
  if (site.pathname !== '/') throw new ConfigurationError('NEXT_PUBLIC_SITE_URL', 'use an origin without a path.');
  if (env.WP_API_URL) parseUrl('WP_API_URL', env.WP_API_URL, false);
  if (env.WP_AUTH_BASE_URL) parseUrl('WP_AUTH_BASE_URL', env.WP_AUTH_BASE_URL, false);
  return { siteUrl: site.origin };
}

/** @param {{env?: NodeJS.ProcessEnv, production?: boolean}} [options] */
function validateRuntimeEnvironment({ env = process.env, production = env.NODE_ENV === 'production' } = {}) {
  const secret = getAuthSessionSecret(env);
  if (production && (/^(?:<[^>]*>$|change.?me|replace|your.?secret|example|test.?secret|development)/i.test(secret) || new Set(secret).size < 8)) {
    throw new ConfigurationError('AUTH_SESSION_SECRET', 'use a cryptographically random secret, not a placeholder or repeated text.');
  }
  if (production && !env.NEXT_PUBLIC_SITE_URL) {
    throw new ConfigurationError('NEXT_PUBLIC_SITE_URL', 'set the public HTTPS origin, or an HTTP loopback origin such as http://localhost:3000 for local preview.');
  }
  const site = parseUrl('NEXT_PUBLIC_SITE_URL', env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', production, true);
  if (site.pathname !== '/') throw new ConfigurationError('NEXT_PUBLIC_SITE_URL', 'use an origin without a path.');
  const wordpress = parseUrl('WP_API_URL', env.WP_API_URL || env.NEXT_PUBLIC_BASE_URL || env.WP_AUTH_BASE_URL || 'https://nrhstore.ir/wp-json', production);
  const auth = parseUrl('WP_AUTH_BASE_URL', env.WP_AUTH_BASE_URL || 'https://nrhstore.ir/wp-json', production);
  const namespace = (env.WP_AUTH_NAMESPACE || 'boom/v1').replace(/^\/+|\/+$/g, '');
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(namespace)) {
    throw new ConfigurationError('WP_AUTH_NAMESPACE', 'use a REST namespace such as boom/v1.');
  }
  validateBannerAdminEnvironment({ env, production });
  return {
    siteUrl: site.origin,
    wordpressApiUrl: wordpress.toString().replace(/\/+$/, '').replace(/\/wc\/store\/v1$/, ''),
    authApiUrl: auth.toString().replace(/\/+$/, '') + '/' + namespace,
  };
}

module.exports = { ConfigurationError, getAuthSessionSecret, validateBuildEnvironment, validateRuntimeEnvironment, validateBannerAdminEnvironment, BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS };
