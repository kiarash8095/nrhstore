/* eslint-disable @typescript-eslint/no-require-imports -- Standalone public UI regression test. */
// Browser response fixtures only; this check never edits the published banner document.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const runtime = process.env.BANNERS_PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(runtime);
const { expect: baseExpect } = require(runtime + '/test');
const expect = baseExpect.configure({ timeout: 45000 });
const origin = process.env.BANNERS_TEST_URL || 'http://localhost:3000';
const output = path.resolve('artifacts/banners');
let browser;
const errors = [];
const checks = [];

const activeIndex = hero => hero.locator('[data-banner-dot][aria-disabled="true"]').getAttribute('data-banner-dot');

async function ready(page, context, getDocument) {
  page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(() => {
    window.bannerUnhandled = [];
    window.addEventListener('unhandledrejection', event => window.bannerUnhandled.push(String(event.reason)));
  });
  await page.route('**/api/banners', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(getDocument()) }));
  const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/banners');
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await expect(page.locator('[data-banner-section="slider"]')).toBeVisible();
  await refreshed;
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function screenshotSection(page, group, filename) {
  const section = page.locator(`[data-banner-section="${group}"]`);
  await section.scrollIntoViewIfNeeded();
  const images = section.locator(group === 'slider' ? '[aria-hidden="false"] img' : 'img');
  await expect.poll(() => images.evaluateAll(items => items.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  if (group === 'slider') await expect.poll(async () => {
    const slide = await section.locator('[data-slot="carousel-item"][aria-hidden="false"]').boundingBox();
    const viewport = await section.locator('[data-slot="carousel-content"]').boundingBox();
    return slide && viewport ? Math.abs(slide.x - viewport.x) : Infinity;
  }).toBeLessThan(1);
  await page.mouse.move(0, 0);
  await section.screenshot({ path: path.join(output, filename), animations: 'disabled' });
}

async function run() {
  await fs.mkdir(output, { recursive: true });
  const response = await fetch(origin + '/api/banners');
  assert.equal(response.status, 200);
  const document = await response.json();
  assert.ok(document.banners.filter(banner => banner.group === 'slider').length >= 2, 'The slider check requires two banners');
  browser = await chromium.launch({ headless: true, channel: process.env.BANNERS_BROWSER_CHANNEL || 'msedge' });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'fa-IR' });
  const page = await desktop.newPage();
  await ready(page, desktop, () => document);
  const hero = page.locator('[data-banner-section="slider"]');
  const rotation = hero.locator('[data-rotation-control]');
  if ((await rotation.getAttribute('aria-label')).startsWith('توقف')) await rotation.click();
  if (await activeIndex(hero) !== '0') await hero.locator('[data-banner-dot="0"]').click();
  await expect.poll(() => activeIndex(hero)).toBe('0');
  await expect(hero).toHaveAttribute('dir', 'ltr');
  assert.equal(await hero.evaluate(element => getComputedStyle(element).direction), 'ltr');
  const dotPositions = await hero.locator('[data-banner-dot]').evaluateAll(dots => dots.map(dot => dot.getBoundingClientRect().x));
  assert.ok(dotPositions.every((x, index) => index === 0 || x > dotPositions[index - 1]), 'Banner selectors must progress left to right');
  const previousButton = await hero.getByRole('button', { name: 'اسلاید قبلی', exact: true }).boundingBox();
  const nextButton = await hero.getByRole('button', { name: 'اسلاید بعدی', exact: true }).boundingBox();
  assert.ok(previousButton.x < nextButton.x, 'Previous must be on the left and next on the right');
  await hero.getByRole('button', { name: 'اسلاید بعدی', exact: true }).click();
  await expect.poll(() => activeIndex(hero)).toBe('1');
  await hero.getByRole('button', { name: 'اسلاید قبلی', exact: true }).press('ArrowLeft');
  await expect.poll(() => activeIndex(hero)).toBe('0');
  await hero.getByRole('button', { name: 'اسلاید بعدی', exact: true }).press('ArrowRight');
  await expect.poll(() => activeIndex(hero)).toBe('1');
  await hero.getByRole('button', { name: 'اسلاید قبلی', exact: true }).click();
  await expect.poll(() => activeIndex(hero)).toBe('0');
  await hero.locator('[data-banner-dot="1"]').click();
  await expect.poll(() => activeIndex(hero)).toBe('1');
  assert.equal(await hero.locator('[data-slot="carousel-item"][aria-hidden="false"] a').count(), 1);
  assert.equal(await hero.locator('[data-slot="carousel-item"][aria-hidden="true"]:not([inert])').count(), 0);
  for (const href of await page.locator('[data-banner-card]').evaluateAll(cards => cards.map(card => card.getAttribute('href')))) assert.ok(href.startsWith('/products'), href);
  checks.push('LTR layout, selector order, arrow positions, keyboard navigation, inactive-slide focus exclusion and internal destinations');
  console.log('PASS: navigation controls and focus exclusion');
  await hero.locator('[data-banner-dot="0"]').click();
  await screenshotSection(page, 'slider', 'hero-desktop.png');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(output, 'home-desktop.png'), animations: 'disabled' });
  await screenshotSection(page, 'featured', 'featured-desktop.png');
  await screenshotSection(page, 'hardware', 'hardware-desktop.png');
  await screenshotSection(page, 'connection', 'network-desktop.png');

  // Rotation pauses on hover, resumes on leaving, and stays stopped after keyboard focus.
  await hero.scrollIntoViewIfNeeded();
  await rotation.click();
  await expect(rotation).toHaveAttribute('aria-label', 'توقف نمایش خودکار بنرها');
  const beforeHover = await activeIndex(hero);
  await page.waitForTimeout(6500);
  assert.equal(await activeIndex(hero), beforeHover, 'Autoplay continued during hover');
  await page.mouse.move(5, 5);
  await expect.poll(() => activeIndex(hero), { timeout: 10000 }).not.toBe(beforeHover);
  const link = hero.locator('[data-slot="carousel-item"][aria-hidden="false"] a');
  await link.focus();
  await expect(rotation).toHaveAttribute('aria-label', 'شروع نمایش خودکار بنرها');
  const beforeFocus = await activeIndex(hero);
  await page.waitForTimeout(6500);
  assert.equal(await activeIndex(hero), beforeFocus, 'Autoplay restarted after keyboard focus');
  checks.push('Autoplay hover pause, resume and persistent focus pause');

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR', isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const mobile = await mobileContext.newPage();
  let fixture = document;
  await ready(mobile, mobileContext, () => fixture);
  const mobileHero = mobile.locator('[data-banner-section="slider"]');
  await expect(mobileHero.locator('[data-rotation-control]')).toHaveAttribute('aria-label', 'شروع نمایش خودکار بنرها');
  await mobile.waitForTimeout(6500);
  assert.equal(await activeIndex(mobileHero), '0', 'Reduced motion did not disable automatic rotation');
  for (const width of [320, 390, 768]) {
    await mobile.setViewportSize({ width, height: 844 });
    const dimensions = await mobile.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scrollWidth <= dimensions.width, `Horizontal overflow at ${width}px`);
  }
  await mobile.setViewportSize({ width: 390, height: 844 });
  await screenshotSection(mobile, 'slider', 'hero-mobile.png');
  await mobile.evaluate(() => window.scrollTo(0, 0));
  await mobile.screenshot({ path: path.join(output, 'home-mobile.png'), animations: 'disabled' });
  await screenshotSection(mobile, 'featured', 'featured-mobile.png');
  await screenshotSection(mobile, 'hardware', 'hardware-mobile.png');
  await screenshotSection(mobile, 'connection', 'network-mobile.png');
  checks.push('Reduced motion and responsive layout at 320px, 390px and 768px');

  const first = document.banners.find(banner => banner.group === 'slider');
  fixture = { ...document, revision: 'public-ui-single', banners: document.banners.filter(banner => banner.group !== 'slider' || banner.id === first.id) };
  await mobile.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(mobileHero.locator('[data-rotation-control]')).toHaveCount(0);
  await expect(mobileHero.locator('[data-banner-dot]')).toHaveCount(0);
  fixture = { ...document, revision: 'public-ui-empty', banners: document.banners.filter(banner => banner.group !== 'slider') };
  await mobile.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(mobileHero).toHaveCount(0);
  checks.push('Live refresh with one slide or an empty slider');
  assert.deepEqual(await page.evaluate(() => window.bannerUnhandled), []);
  assert.deepEqual(await mobile.evaluate(() => window.bannerUnhandled), []);
  assert.deepEqual(errors, [], 'Browser runtime errors');
  await fs.writeFile(path.join(output, 'public-ui-results.json'), JSON.stringify({ checks, runtimeErrors: errors, publishedDataChanged: false }, null, 2));
  console.log(JSON.stringify({ checks, runtimeErrors: errors }, null, 2));
  await desktop.close();
  await mobileContext.close();
}

run().then(() => process.exitCode = 0, error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await Promise.race([browser?.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  process.exit(process.exitCode || 0);
});
