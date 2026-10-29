/* eslint-disable @typescript-eslint/no-require-imports -- Node environment setup regression tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { prepareDevelopmentEnvironment } = require('../../scripts/environment.cjs');
const { validateRuntimeEnvironment, ConfigurationError, BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS } = require('../../lib/server/runtime-config.cjs');
const script = path.resolve(__dirname, '../../scripts/environment.cjs');
const template = 'WP_API_URL=https://nrhstore.ir/wp-json\nWP_AUTH_BASE_URL=https://nrhstore.ir/wp-json\nAUTH_SESSION_SECRET=\nNEXT_PUBLIC_SITE_URL=https://nrhstore.ir\nBANNERS_ADMIN_USERNAME=admin\nBANNERS_ADMIN_PASSWORD=\nBANNERS_ADMIN_SESSION_SECRET=\n';
const privateBannerEnv = { BANNERS_ADMIN_USERNAME: 'fixture-admin', BANNERS_ADMIN_PASSWORD: 'Private-fixture-password', BANNERS_ADMIN_SESSION_SECRET: randomBytes(32).toString('hex') };

async function fixture(t) {
  const parent = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(parent, 'nrh-env-test-'));
  t.after(async () => {
    const resolved = await fs.realpath(directory);
    assert.equal(path.dirname(resolved), parent);
    assert.ok(path.basename(resolved).startsWith('nrh-env-test-'));
    await fs.rm(resolved, { recursive: true, force: true });
  });
  await fs.writeFile(path.join(directory, '.env.example'), template);
  return directory;
}
async function contents(root) { return fs.readFile(path.join(root, '.env.local'), 'utf8'); }
function secretFrom(text) { return text.match(/^AUTH_SESSION_SECRET=(.*)$/m)?.[1]; }
function cli(root, ...args) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^(AUTH_|BANNERS_|WP_|NEXT_PUBLIC_|NODE_ENV$|__NEXT_PROCESSED_ENV$)/.test(key)) delete env[key];
  return spawnSync(process.execPath, [script, ...args], { cwd: root, env, encoding: 'utf8', timeout: 20000 });
}

test('a fresh device gets a private, persistent development key and local frontend origin', async t => {
  const root = await fixture(t);
  const result = cli(root, '--setup');
  assert.equal(result.status, 0, result.stderr);
  const text = await contents(root);
  const key = secretFrom(text);
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.match(text, /NEXT_PUBLIC_SITE_URL=http:\/\/localhost:3000/);
  assert.ok(text.includes('BANNERS_ADMIN_PASSWORD=' + BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.password));
  assert.match(text, /^BANNERS_ADMIN_SESSION_SECRET=[a-f0-9]{64}$/m);
  assert.ok(!result.stdout.includes(key) && !result.stderr.includes(key));
  assert.equal(cli(root, '--setup').status, 0);
  assert.equal(await contents(root), text, 'A restart must not rotate the session key');
});

test('Windows CRLF templates preserve line boundaries between comments and generated settings', async t => {
  const root = await fixture(t);
  const windowsTemplate = template.replace(/^(AUTH_SESSION_SECRET|BANNERS_ADMIN_PASSWORD|BANNERS_ADMIN_SESSION_SECRET)=/gm, '# generated setting\n$1=').replace(/\n/g, '\r\n');
  await fs.writeFile(path.join(root, '.env.example'), windowsTemplate);
  const result = cli(root, '--setup');
  assert.equal(result.status, 0, result.stderr);
  const text = await contents(root);
  assert.match(text, /# generated setting\r\nAUTH_SESSION_SECRET=[a-f0-9]{64}\r\n/);
  assert.match(text, /# generated setting\r\nBANNERS_ADMIN_SESSION_SECRET=[a-f0-9]{64}\r\n/);
  assert.ok(text.includes('# generated setting\r\nBANNERS_ADMIN_PASSWORD=' + BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.password + '\r\n'));
});

test('legacy CR-only settings preserve the already-created key while completing banner setup', async t => {
  const root = await fixture(t), key = randomBytes(32).toString('hex');
  await fs.writeFile(path.join(root,'.env.local'),'# older Windows setup\rAUTH_SESSION_SECRET='+key+'\r\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\r\n');
  const result=cli(root,'--setup');
  assert.equal(result.status,0,result.stderr);
  assert.equal(secretFrom(await contents(root)),key);
});

test('empty quoted settings and inline comments are parsed without losing their comments', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root,'.env.local'),'AUTH_SESSION_SECRET="" # customer key\nBANNERS_ADMIN_PASSWORD= # banner password\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n');
  const result = cli(root,'--setup');
  assert.equal(result.status,0,result.stderr);
  const text=await contents(root);
  assert.match(text,/AUTH_SESSION_SECRET=[a-f0-9]{64} # customer key/);
  assert.ok(text.includes('BANNERS_ADMIN_PASSWORD='+BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.password+' # banner password'));
  assert.equal(cli(root,'--setup').status,0);
  assert.equal(await contents(root),text);
});

test('independent development installations receive independent secrets', async t => {
  const first = await fixture(t), second = await fixture(t);
  await prepareDevelopmentEnvironment(first);
  await prepareDevelopmentEnvironment(second);
  assert.notEqual(secretFrom(await contents(first)), secretFrom(await contents(second)));
  const bannerKey = text => text.match(/^BANNERS_ADMIN_SESSION_SECRET=(.*)$/m)?.[1];
  assert.notEqual(bannerKey(await contents(first)), bannerKey(await contents(second)));
});

test('setup fills an empty key while preserving existing credentials, comments and origin', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, '.env.local'), '# custom\nPRIVATE_VALUE=keep-this\nAUTH_SESSION_SECRET=""\nNEXT_PUBLIC_SITE_URL=http://localhost:3010\n');
  await prepareDevelopmentEnvironment(root);
  const text = await contents(root);
  assert.match(text, /PRIVATE_VALUE=keep-this/);
  assert.match(text, /# custom/);
  assert.match(text, /NEXT_PUBLIC_SITE_URL=http:\/\/localhost:3010/);
  assert.match(secretFrom(text), /^[a-f0-9]{64}$/);
});

test('an existing customer key does not skip banner setup on a new clone', async t => {
  const root = await fixture(t);
  const key = randomBytes(32).toString('hex');
  await fs.writeFile(path.join(root, '.env.local'), 'AUTH_SESSION_SECRET=' + key + '\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n');
  const result = cli(root, '--setup');
  assert.equal(result.status, 0, result.stderr);
  const text = await contents(root);
  assert.equal(secretFrom(text), key);
  assert.ok(text.includes('BANNERS_ADMIN_USERNAME=' + BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.username));
  assert.ok(text.includes('BANNERS_ADMIN_PASSWORD=' + BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS.password));
  assert.match(text, /^BANNERS_ADMIN_SESSION_SECRET=[a-f0-9]{64}$/m);
});

test('explicit banner credentials remain unchanged across setup and restart', async t => {
  const root = await fixture(t);
  const original = Object.entries(privateBannerEnv).map(([key,value]) => key + '=' + value).join('\n') + '\n';
  await fs.writeFile(path.join(root, '.env.local'), original);
  await prepareDevelopmentEnvironment(root);
  const first = await contents(root);
  for (const [key,value] of Object.entries(privateBannerEnv)) assert.ok(first.includes(key + '=' + value));
  assert.equal(await prepareDevelopmentEnvironment(root), false);
  assert.equal(await contents(root), first);
});

test('higher-priority environment credentials are preserved and never copied into the local file', async t => {
  const root = await fixture(t);
  const supplied = { ...privateBannerEnv, AUTH_SESSION_SECRET:randomBytes(32).toString('hex') };
  assert.equal(await prepareDevelopmentEnvironment(root, supplied), false);
  await assert.rejects(contents(root), { code:'ENOENT' });
});

test('an explicitly invalid banner password fails preflight without revealing or replacing it', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, '.env.local'), 'BANNERS_ADMIN_PASSWORD=short7\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n');
  const result = cli(root, '--setup');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /BANNERS_ADMIN_PASSWORD/);
  assert.ok(!result.stdout.includes('short7') && !result.stderr.includes('short7'));
  assert.match(await contents(root), /^BANNERS_ADMIN_PASSWORD=short7$/m);
});

test('concurrent setup cannot rotate or truncate the environment file', async t => {
  const root = await fixture(t);
  const changes = await Promise.all(Array.from({ length: 5 }, () => prepareDevelopmentEnvironment(root)));
  assert.equal(changes.filter(Boolean).length, 1);
  assert.match(secretFrom(await contents(root)), /^[a-f0-9]{64}$/);
  assert.ok(!(await fs.readdir(root)).some(name => /\.tmp$|\.lock$/.test(name)));
});

test('an existing invalid key is reported without being overwritten', async t => {
  const root = await fixture(t);
  const text = template.replace('AUTH_SESSION_SECRET=', 'AUTH_SESSION_SECRET=too-short');
  await fs.writeFile(path.join(root, '.env.local'), text);
  const result = cli(root, '--setup');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /AUTH_SESSION_SECRET/);
  assert.ok(!result.stderr.includes('too-short'));
  assert.equal(await contents(root), text);
});

test('production refuses missing configuration and never creates development secrets', async t => {
  const root = await fixture(t);
  const result = cli(root, '--production');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /AUTH_SESSION_SECRET/);
  await assert.rejects(contents(root), { code: 'ENOENT' });
  assert.equal(cli(root, '--production', '--setup').status, 1);
});

test('production validates HTTPS origins and rejects unsafe or placeholder values', () => {
  const env = { ...privateBannerEnv, AUTH_SESSION_SECRET: randomBytes(32).toString('hex'), NEXT_PUBLIC_SITE_URL: 'https://shop.example.test', WP_API_URL: 'https://cms.example.test/wp-json', WP_AUTH_BASE_URL: 'https://cms.example.test/wp-json' };
  assert.equal(validateRuntimeEnvironment({ env, production: true }).siteUrl, env.NEXT_PUBLIC_SITE_URL);
  for (const update of [{ AUTH_SESSION_SECRET: 'a'.repeat(64) }, { NEXT_PUBLIC_SITE_URL: 'http://shop.example.test' }, { NEXT_PUBLIC_SITE_URL: 'https://shop.example.test/private' }, { WP_API_URL: 'https://user:password@cms.example.test/wp-json' }, { WP_AUTH_BASE_URL: 'http://cms.example.test/wp-json' }, { WP_AUTH_NAMESPACE: '../private' }]) {
    assert.throws(() => validateRuntimeEnvironment({ env: { ...env, ...update }, production: true }), ConfigurationError);
  }
});

test('production accepts a configured host without changing its key', async t => {
  const root = await fixture(t), secret = randomBytes(32).toString('hex');
  let text = template.replace('AUTH_SESSION_SECRET=', 'AUTH_SESSION_SECRET=' + secret);
  for (const [name, value] of Object.entries(privateBannerEnv)) text = text.replace(new RegExp('^' + name + '=.*$', 'm'), () => name + '=' + value);
  await fs.writeFile(path.join(root, '.env.local'), text);
  const result = cli(root, '--production');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await contents(root), text);
  assert.ok(!result.stdout.includes(secret));
});

test('NODE_ENV=production cannot accidentally trigger development secret generation', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, '.env.local'), 'NODE_ENV=production\nAUTH_SESSION_SECRET=\n');
  const before = await contents(root);
  const result = cli(root, '--setup');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /only allowed for local development/);
  assert.equal(await contents(root), before);
});

test('a stored development key decrypts the same session in a separate Node process', async t => {
  const root = await fixture(t);
  await prepareDevelopmentEnvironment(root);
  const secret = secretFrom(await contents(root));
  const loader = path.resolve(__dirname, '../../features/auth/tests/auth-test-loader.cjs');
  const source = "const load=require(process.argv[1]);const c=load('features/auth/server/cookies.ts');if(process.argv[2]==='encode'){process.stdout.write(c.encodeJar({wordpress_logged_in_fixture:'test-session'}))}else{let input='';process.stdin.on('data',chunk=>input+=chunk);process.stdin.on('end',()=>process.stdout.write(c.decodeJar(input).wordpress_logged_in_fixture||'invalid'));}";
  const options = { env: { ...process.env, AUTH_SESSION_SECRET: secret }, encoding: 'utf8', timeout: 10000 };
  const first = spawnSync(process.execPath, ['-e', source, loader, 'encode'], options);
  assert.equal(first.status, 0, first.stderr);
  const second = spawnSync(process.execPath, ['-e', source, loader, 'decode'], { ...options, input: first.stdout });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.stdout, 'test-session');
});

test('build works before runtime secrets or storage are provisioned', async t => {
  const root = await fixture(t);
  const result = cli(root, '--build');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Build configuration is ready/);
  assert.deepEqual(await fs.readdir(root), ['.env.example']);
  assert.equal(cli(root, '--production').status, 1, 'Production startup must still require a session secret');
});

test('a local build needs private banner credentials before production preview and preserves them on restart', async t => {
  const root = await fixture(t);
  await prepareDevelopmentEnvironment(root);
  const development = await contents(root);
  assert.equal(cli(root, '--build').status, 0);
  const denied = cli(root, '--production');
  assert.equal(denied.status, 1);
  assert.match(denied.stderr, /BANNERS_ADMIN_PASSWORD/);
  assert.equal(await contents(root), development);
  await fs.writeFile(path.join(root, '.env.local'), development.replace(/^BANNERS_ADMIN_PASSWORD=.*$/m, 'BANNERS_ADMIN_PASSWORD=' + privateBannerEnv.BANNERS_ADMIN_PASSWORD));
  const before = await contents(root);
  const production = cli(root, '--production');
  assert.equal(production.status, 0, production.stderr);
  assert.equal(await contents(root), before);
});

test('production preview permits HTTP only for exact loopback frontend hosts', () => {
  const env = { ...privateBannerEnv, AUTH_SESSION_SECRET: randomBytes(32).toString('hex'), NEXT_PUBLIC_SITE_URL: 'https://shop.example.test' };
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3001', 'http://[::1]:3002']) {
    assert.equal(validateRuntimeEnvironment({ env: { ...env, NEXT_PUBLIC_SITE_URL: origin }, production: true }).siteUrl, origin);
  }
  for (const origin of ['http://shop.example.test', 'http://192.168.1.52:3000', 'http://localhost.example.test', 'http://127.0.0.1.example.test', 'http://localhost.:3000']) {
    assert.throws(() => validateRuntimeEnvironment({ env: { ...env, NEXT_PUBLIC_SITE_URL: origin }, production: true }), /HTTPS is required/);
  }
});

test('loopback preview still requires a strong session secret and HTTPS WordPress APIs', () => {
  const env = { ...privateBannerEnv, AUTH_SESSION_SECRET: randomBytes(32).toString('hex'), NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' };
  for (const update of [{ AUTH_SESSION_SECRET: '' }, { AUTH_SESSION_SECRET: 'a'.repeat(64) }, { WP_API_URL: 'http://127.0.0.1/wp-json' }, { WP_AUTH_BASE_URL: 'http://localhost/wp-json' }]) {
    assert.throws(() => validateRuntimeEnvironment({ env: { ...env, ...update }, production: true }), ConfigurationError);
  }
});

test('build rejects malformed public configuration without revealing its value', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, '.env.local'), 'NEXT_PUBLIC_SITE_URL=https://user:private-password@example.test\n');
  const result = cli(root, '--build');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NEXT_PUBLIC_SITE_URL/);
  assert.ok(!result.stderr.includes('private-password'));
});

test('Next instrumentation skips runtime credentials only during compilation', async () => {
  const load = require('../../features/auth/tests/auth-test-loader.cjs');
  const { register } = load('instrumentation.ts');
  const names = ['NEXT_RUNTIME', 'NEXT_PHASE', 'NODE_ENV', 'AUTH_SESSION_SECRET', 'NEXT_PUBLIC_SITE_URL'];
  const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    process.env.NEXT_RUNTIME = 'nodejs';
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PHASE = require('next/constants').PHASE_PRODUCTION_BUILD;
    delete process.env.AUTH_SESSION_SECRET;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    await register();
    process.env.NEXT_PHASE = require('next/constants').PHASE_PRODUCTION_SERVER;
    await assert.rejects(register(), ConfigurationError);
  } finally {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
    }
  }
});
