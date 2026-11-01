/* eslint-disable @typescript-eslint/no-require-imports -- Real component SSR regression tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('../../auth/tests/auth-test-loader.cjs');

Module._extensions['.tsx'] = (component, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  component._compile(compiled.outputText, filename);
};

const { BannerSlider } = load('features/banners/components/BannerSlider.tsx');
const { HomeBannersProvider } = load('features/banners/components/HomeBannersProvider.tsx');
const { defaultBannerDocument } = load('features/banners/constants/defaults.ts');
const sliders = defaultBannerDocument.banners.filter(banner => banner.group === 'slider');
const render = banners => renderToStaticMarkup(React.createElement(
  HomeBannersProvider,
  { initialDocument: { revision: 'test', banners } },
  React.createElement(BannerSlider),
));

test('an empty slider renders no empty frame or unusable controls', () => {
  assert.equal(render([]), '');
});

test('a single replacement image remains visible without navigation or autoplay controls', () => {
  const html = render([{ ...sliders[0], src: '/api/banner-images/12345678-1234-1234-1234-123456789abc.webp', width: 400, height: 800 }]);
  assert.equal((html.match(/<img\b/g) || []).length, 1);
  assert.doesNotMatch(html, /اسلاید قبلی|اسلاید بعدی|data-rotation-control|data-banner-controls/);
  assert.match(html, /--banner-image-width:25%/);
  assert.match(html, /--banner-image-left:37.5%/);
});

test('multiple slides use actual shadcn buttons and exclude inactive slides from focus', () => {
  const html = render(sliders);
  const buttons = html.match(/<button\b[^>]*>/g) || [];
  assert.equal(buttons.length, sliders.length + 3);
  assert.ok(buttons.every(button => button.includes('data-slot="button"')));
  assert.match(html, /aria-label="اسلاید قبلی"/);
  assert.match(html, /aria-label="اسلاید بعدی"/);
  assert.equal((html.match(/inert=""/g) || []).length, sliders.length - 1);
  assert.match(html, /dir="ltr"/);
});
