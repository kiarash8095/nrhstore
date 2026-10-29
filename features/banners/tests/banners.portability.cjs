/* eslint-disable @typescript-eslint/no-require-imports -- Real Next dev/build/start checks in a fresh project copy; no published banner writes. */
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const runtime = process.env.BANNERS_PLAYWRIGHT_MODULE || 'playwright';
const { chromium, expect } = require(runtime + '/test');
const { BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS } = require('../../../lib/server/runtime-config.cjs');
const repo = path.resolve(__dirname, '../../..');
const next = require.resolve('next/dist/bin/next');
const fixture = path.join(repo, 'tmp', 'banners-portability-' + randomUUID());
const output = path.join(repo, 'artifacts', 'banners-portability');
const devPort = Number(process.env.BANNERS_DEV_TEST_PORT || 3136);
const productionPort = Number(process.env.BANNERS_PRODUCTION_TEST_PORT || 3137);
const report = { checks:[], browserErrors:[], unexpectedWrites:[] };
const baseEnv = { ...process.env };
for (const key of Object.keys(baseEnv)) if (/^(AUTH_|BANNERS_|WP_|NEXT_PUBLIC_|NRH_NEXT_DIST_DIR$|NODE_ENV$|NEXT_PHASE$|__NEXT_PROCESSED_ENV$)/.test(key)) delete baseEnv[key];
let child, browser;
let logs = '';

async function cleanFixture() {
  const directory = await fs.realpath(fixture);
  const parent = await fs.realpath(path.join(repo, 'tmp'));
  assert.equal(path.dirname(directory), parent);
  assert.ok(path.basename(directory).startsWith('banners-portability-'));
  const dependencies = path.join(directory, 'node_modules');
  const link = await fs.lstat(dependencies).catch(() => null);
  if (link) {
    assert.ok(link.isSymbolicLink(), 'Refuse to recursively remove a real dependency directory');
    await fs.unlink(dependencies);
  }
  // Delete children first: Windows can hold the root cwd open and reject rm(root)
  // before it traverses even one child. The dependency junction was detached above.
  for (const name of await fs.readdir(directory)) {
    const target = path.join(directory,name);
    assert.equal(path.dirname(target),directory);
    await fs.rm(target,{recursive:true,force:true,maxRetries:5,retryDelay:300});
  }
  try {
    await fs.rmdir(directory);
  } catch (error) {
    // Windows may briefly retain a process working-directory handle after all
    // test files were deleted. Never ignore a failure that left private fixtures.
    if (error.code !== 'EBUSY' || (await fs.readdir(directory)).length !== 0) throw error;
  }
}

function launch(args, mode) {
  const spawned = spawn(process.execPath, args, { cwd:fixture, env:{...baseEnv,NODE_ENV:mode}, windowsHide:true, stdio:['ignore','pipe','pipe'] });
  spawned.stdout.on('data', data => { logs += data.toString(); });
  spawned.stderr.on('data', data => { logs += data.toString(); });
  return spawned;
}
async function run(args, mode, timeout = 600000) {
  const spawned = launch(args, mode);
  await new Promise((resolve,reject) => {
    const timer=setTimeout(()=>{spawned.kill();reject(new Error('Command timed out: '+args.join(' ')));},timeout);
    spawned.once('error',error=>{clearTimeout(timer);reject(error);});
    spawned.once('exit',code=>{
      clearTimeout(timer);
      if (code===0) resolve();
      else reject(new Error('Command failed: '+args.join(' ')+'\n'+logs.slice(-6000)));
    });
  });
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
  else child.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(4000)]);
  child = null;
}
async function start(mode, port) {
  child=launch([next,mode==='development'?'dev':'start','--hostname','127.0.0.1','--port',String(port)],mode);
  const origin='http://localhost:'+port;
  for (let attempt=0;attempt<150;attempt++) {
    if (child.exitCode !== null) throw new Error('Next exited before readiness:\n'+logs.slice(-6000));
    try { if ((await fetch(origin+'/banners-admin/login',{signal:AbortSignal.timeout(3000)})).status===200) return origin; } catch {}
    await delay(500);
  }
  throw new Error('Next login page did not become ready:\n'+logs.slice(-6000));
}
async function login(origin, credentials, mode) {
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.route('**/api/**',route=>{
    const request=route.request(), pathname=new URL(request.url()).pathname;
    if (!['GET','HEAD'].includes(request.method()) && !(pathname==='/api/banners-admin/session' && request.method()==='POST')) {
      report.unexpectedWrites.push(pathname); return route.abort();
    }
    if (pathname==='/api/cart') return route.fulfill({status:503,contentType:'application/json',body:'{}'});
    return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>report.browserErrors.push(error.message));
  await page.goto(origin+'/banners-admin/login',{waitUntil:'domcontentloaded',timeout:120000});
  const username=page.locator('#admin-username'), password=page.locator('#admin-password');
  await expect(username).toBeEnabled({timeout:60000});
  await expect(password).toBeEnabled();
  await page.screenshot({path:path.join(output,mode+'-login.png'),fullPage:true});
  await username.fill(credentials.username);
  await password.fill(credentials.password);
  await page.getByRole('button',{name:'ورود به پنل',exact:true}).click();
  await expect(page).toHaveURL(origin+'/banners-admin',{timeout:120000});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page).toHaveURL(origin+'/banners-admin');
  const cookie=(await context.cookies()).find(cookie=>cookie.name==='nrh_banners_admin');
  assert.ok(cookie?.httpOnly);
  assert.equal(cookie.sameSite,'Strict');
  assert.equal(cookie.secure,mode==='production');
  return {context,page};
}

(async()=>{
  await fs.mkdir(fixture,{recursive:true});
  await fs.mkdir(output,{recursive:true});
  const folders=new Set(['app','components','configs','constants','features','hooks','lib','providers','public','scripts','styles','types','utils','wordpress','tests']);
  for (const entry of await fs.readdir(repo,{withFileTypes:true})) {
    if ((entry.isDirectory() && folders.has(entry.name)) || (entry.isFile() && (/\.(?:[cm]?[jt]s|json)$/.test(entry.name) && !entry.name.endsWith('.tsbuildinfo') || entry.name==='.env.example'))) {
      await fs.cp(path.join(repo,entry.name),path.join(fixture,entry.name),{recursive:true});
    }
  }
  await fs.symlink(path.join(repo,'node_modules'),path.join(fixture,'node_modules'),process.platform==='win32'?'junction':'dir');
  await assert.rejects(fs.access(path.join(fixture,'.env.local')));
  console.log('Checking fresh-clone development setup and browser login...');
  await run(['scripts/environment.cjs','--setup'],'development');
  const developmentEnv=await fs.readFile(path.join(fixture,'.env.local'),'utf8');
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'}:{})});
  const devOrigin=await start('development',devPort);
  const development=await login(devOrigin,BANNERS_ADMIN_DEVELOPMENT_CREDENTIALS,'development');
  await stop();
  await run(['scripts/environment.cjs','--setup'],'development');
  assert.equal(await fs.readFile(path.join(fixture,'.env.local'),'utf8'),developmentEnv);
  await start('development',devPort);
  await development.page.reload({waitUntil:'domcontentloaded',timeout:120000});
  await expect(development.page).toHaveURL(devOrigin+'/banners-admin');
  await development.context.close();
  await stop();
  report.checks.push('fresh clone: default dev login, enabled fields, protected cookie, reload and restart with unchanged environment');

  console.log('Building a fresh copy without runtime env files...');
  await fs.rename(path.join(fixture,'.env.local'),path.join(fixture,'development-env.snapshot'));
  await run(['scripts/environment.cjs','--build'],'production');
  await run([next,'build'],'production');
  await assert.rejects(fs.access(path.join(fixture,'.env.local')));
  report.checks.push('production build without private runtime credentials; no environment generation during build');

  console.log('Checking private production login and session persistence...');
  const privateCredentials={username:'portable-test-admin',password:randomBytes(18).toString('base64url')};
  const runtimePublicOrigin = 'https://runtime-banner.example.test';
  const productionEnv=['BANNERS_ADMIN_USERNAME='+privateCredentials.username,'BANNERS_ADMIN_PASSWORD='+privateCredentials.password,'BANNERS_ADMIN_SESSION_SECRET='+randomBytes(32).toString('hex'),'AUTH_SESSION_SECRET='+randomBytes(32).toString('hex'),'NEXT_PUBLIC_SITE_URL='+runtimePublicOrigin].join('\n')+'\n';
  await fs.writeFile(path.join(fixture,'.env.production.local'),productionEnv,{mode:0o600});
  await run(['scripts/environment.cjs','--production'],'production');
  const productionOrigin=await start('production',productionPort);
  const proxied = await fetch(productionOrigin+'/api/banners-admin/session',{method:'POST',headers:{Origin:runtimePublicOrigin,'Content-Type':'application/json'},body:JSON.stringify(privateCredentials)});
  assert.equal(proxied.status,200,'The private runtime frontend origin must work behind TLS termination, even when it differs from the public build default');
  report.checks.push('runtime HTTPS proxy origin is read after build, independently of the build-time public origin');
  const production=await login(productionOrigin,privateCredentials,'production');
  await stop();
  await run(['scripts/environment.cjs','--production'],'production');
  await start('production',productionPort);
  await production.page.reload({waitUntil:'domcontentloaded',timeout:120000});
  await expect(production.page).toHaveURL(productionOrigin+'/banners-admin');
  assert.equal(await fs.readFile(path.join(fixture,'.env.production.local'),'utf8'),productionEnv);
  await production.context.close();
  report.checks.push('private production login, Secure cookie, reload and restart with unchanged environment');
  assert.deepEqual(report.browserErrors,[]);
  assert.deepEqual(report.unexpectedWrites,[]);
  console.log(JSON.stringify(report,null,2));
})().catch(error=>{report.error=error.message;console.error(error);process.exitCode=1;}).finally(async()=>{
  await stop();
  await Promise.race([browser?.close(),delay(4000)]);
  await fs.mkdir(output,{recursive:true});
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2));
  await fs.writeFile(path.join(output,'server.log'),logs);
  await cleanFixture();
  process.exit(process.exitCode||0);
});
