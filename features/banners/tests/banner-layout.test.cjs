/* eslint-disable @typescript-eslint/no-require-imports -- Standalone geometry regression tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('../../auth/tests/auth-test-loader.cjs');
const { getBannerLayout } = load('features/banners/utils/banner-layout.ts');

const bundled = [
  { src: '/Untitled-1-2.webp', width: 1774, height: 444, content: [125, 1660] },
  { src: '/Untitled-11.webp', width: 1774, height: 443, content: [120, 1660] },
  { src: '/slider1-5.webp', width: 2000, height: 400, content: [560, 1790] },
  { src: '/slider4.webp', width: 2000, height: 400, content: [490, 1800] },
];

function visibleX(sourceX, sourceWidth, layout) {
  return layout.imageLeft + (sourceX / sourceWidth) * layout.imageWidth;
}

test('side crops exclude both baked-in arrows from the laptop and gaming artwork', () => {
  for (const banner of bundled.slice(0, 2)) {
    const layout = getBannerLayout(banner, 3.3);
    assert.ok(visibleX(80, banner.width, layout) < 0, banner.src + ': left decorative arrow');
    assert.ok(visibleX(1690, banner.width, layout) > 1, banner.src + ': right decorative arrow');
  }
});

test('all bundled crops retain the main text and product content at every tested width', () => {
  for (const width of [320, 390, 640, 768, 1024, 1440, 1920]) {
    for (const banner of bundled) {
      const layout = getBannerLayout(banner, 3.3);
      const [start, end] = banner.content.map(x => visibleX(x, banner.width, layout) * width);
      assert.ok(start >= 0 && end <= width, `${banner.src} clips important artwork at ${width}px`);
      const imageHeight = width * layout.imageWidth * banner.height / banner.width;
      assert.ok(imageHeight <= width / 3.3 + 0.001, 'The shared frame must not crop vertically');
    }
  }
});

test('replacement uploads do not inherit the previous bundled artwork crop', () => {
  const banner = { src: '/api/banner-images/12345678-1234-1234-1234-123456789abc.webp', width: 2000, height: 400 };
  const layout = getBannerLayout(banner, 3.3);
  assert.equal(visibleX(0, banner.width, layout), 0);
  assert.equal(visibleX(banner.width, banner.width, layout), 1);
  assert.equal(layout.aspectRatio, 5);
});

test('portrait uploads fit entirely inside a landscape frame without stretching or edge clipping', () => {
  const banner = { src: '/replacement.webp', width: 400, height: 800 };
  const frameWidth = 360;
  const frameRatio = 2;
  const layout = getBannerLayout(banner, frameRatio);
  const renderedWidth = frameWidth * layout.imageWidth;
  const renderedHeight = renderedWidth * banner.height / banner.width;
  assert.equal(renderedHeight, frameWidth / frameRatio);
  assert.ok(visibleX(0, banner.width, layout) >= 0);
  assert.ok(visibleX(banner.width, banner.width, layout) <= 1);
  assert.equal(renderedWidth / renderedHeight, banner.width / banner.height);
});
