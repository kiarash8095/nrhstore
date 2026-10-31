/* eslint-disable @typescript-eslint/no-require-imports -- Portable PHP test launcher. */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const php = process.env.PHP_BINARY || (process.platform === 'win32' && fs.existsSync('C:/xampp/php/php.exe') ? 'C:/xampp/php/php.exe' : 'php');
for (const file of ['wordpress/nrh-headless-checkout/nrh-headless-checkout.php', 'wordpress/nrh-headless-checkout/includes/class-nrh-headless-checkout.php', 'wordpress/nrh-headless-checkout/includes/class-nrh-cart-session.php', 'wordpress/nrh-headless-checkout/includes/class-nrh-cart-lock.php', 'wordpress/nrh-headless-checkout/includes/class-nrh-account-lock.php']) {
  const check = spawnSync(php, ['-l', file], { encoding: 'utf8' });
  if (check.error || check.status !== 0) { process.stderr.write(check.error?.message || check.stderr); process.exit(1); }
}
let failed = false;
for (const suite of ['checkout', 'cart-session', 'cart-lock', 'account-lock']) {
const result = spawnSync(php, [`wordpress/tests/${suite}.test.php`], { encoding: 'utf8' });
process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
if (result.error) { process.stderr.write(result.error.message); process.exit(1); }
const start = result.stdout.lastIndexOf('\n{');
if (start >= 0) {
  const dir = path.resolve('artifacts/payments'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, suite === 'checkout' ? 'wordpress-results.json' : `${suite}-results.json`), JSON.stringify(JSON.parse(result.stdout.slice(start)), null, 2) + '\n');
}
failed ||= result.status !== 0;
}
process.exit(failed ? 1 : 0);
