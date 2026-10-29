const originalFetch = global.fetch;
if (!process.env.USER_PANEL_MOCK_ORIGIN)
  throw new Error(
    'This preload is only for the isolated user-panel browser test.',
  );
global.fetch = function (input, options) {
  const source =
    input instanceof Request ? new URL(input.url) : new URL(String(input));
  if (source.hostname === 'cms.example.test') {
    const target = new URL(
      source.pathname + source.search,
      process.env.USER_PANEL_MOCK_ORIGIN,
    );
    return originalFetch(
      input instanceof Request ? new Request(target, input) : target,
      options,
    );
  }
  return originalFetch(input, options);
};
