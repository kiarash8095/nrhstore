/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node test loader. */
// Test-process-only TypeScript/alias loader. Next.js still enforces server-only
// imports in the application; no production file imports this helper.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "../../..");
const originalLoad = Module._load;
const originalResolve = Module._resolveFilename;
let cookieSnapshot = {};

Module._load = function (request, parent, main) {
  if (request === "server-only") return {};
  if (request === "next/headers") return {
    ...originalLoad.call(this, request, parent, main),
    cookies: async () => ({ get: name => cookieSnapshot[name] ? { value: cookieSnapshot[name] } : undefined }),
  };
  return originalLoad.call(this, request, parent, main);
};
Module._resolveFilename = function (request, parent, ...rest) {
  return originalResolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, parent, ...rest);
};
Module._extensions[".ts"] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
};

module.exports = (relative) => require(path.join(root, relative));
module.exports.setCookieSnapshot = value => { cookieSnapshot = value; };
