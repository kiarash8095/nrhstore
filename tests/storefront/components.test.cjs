/* eslint-disable @typescript-eslint/no-require-imports -- Isolated component regression tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Compile only the component under test; mocks are scoped to this module instance.
function loadComponent(relative, mocks = {}) {
  const filename = path.resolve(relative);
  const component = new Module(filename, module);
  component.filename = filename;
  component.paths = Module._nodeModulePaths(path.dirname(filename));
  const requireFromComponent = component.require.bind(component);
  component.require = name => Object.hasOwn(mocks, name) ? mocks[name] : requireFromComponent(name);
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  component._compile(result.outputText, filename);
  return component.exports;
}

function purchaseMarkup(state, props = {}) {
  const { AddToCartButton } = loadComponent('features/cart/components/AddToCartButton.tsx', {
    '../hooks/use-cart': { useCart: () => ({ isSessionReady: true, isLoading: false, busy: false, ...state }) },
  });
  return renderToStaticMarkup(React.createElement(AddToCartButton, { item: { id: 12, quantity: 1 }, ...props }));
}

test('an available product can be added while the initial cart read is still pending', () => {
  const html = purchaseMarkup({ isLoading: true });
  assert.doesNotMatch(html, /disabled=""/);
  assert.match(html, /افزودن به سبد خرید/);
});

test('session restoration explains preparation and prevents writing under an unknown identity', () => {
  const html = purchaseMarkup({ isSessionReady: false, isLoading: true });
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /در حال آماده‌سازی خرید/);
  assert.doesNotMatch(html, /opacity-40/);
});

test('an in-flight cart write prevents another purchase and announces progress', () => {
  const html = purchaseMarkup({ busy: true });
  assert.match(html, /disabled=""/);
  assert.match(html, /در حال افزودن/);
});

test('unavailable products remain disabled after the cart session is ready', () => {
  assert.match(purchaseMarkup({}, { disabled: true }), /disabled=""/);
});

const { ProductDescription } = loadComponent('features/products/components/ProductDescription.tsx', { 'server-only': {} });
const descriptionMarkup = value => renderToStaticMarkup(React.createElement(ProductDescription, { value }));

test('product descriptions preserve paragraphs, lists, emphasis and safe links', () => {
  const html = descriptionMarkup('<p>شرح <strong>محصول</strong></p><ul><li>ویژگی اول</li></ul><a href="https://example.com">راهنما</a>');
  assert.match(html, /<p>شرح <strong>محصول<\/strong><\/p>/);
  assert.match(html, /<ul><li>ویژگی اول<\/li><\/ul>/);
  assert.match(html, /href="https:\/\/example.com"/);
});

test('untrusted description HTML cannot introduce scripts, handlers, frames or unsafe links', () => {
  const html = descriptionMarkup('<script>alert(1)</script><p onclick="alert(1)">محصول</p><iframe src="https://example.com"></iframe><a href="javascript:alert(1)">لینک</a>');
  assert.doesNotMatch(html, /<script|<iframe|onclick|javascript:/i);
  assert.match(html, /<p>محصول<\/p>/);
});

test('missing product descriptions have a readable empty state', () => {
  assert.match(descriptionMarkup(''), /توضیحی برای این محصول ثبت نشده است/);
});
