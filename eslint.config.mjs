import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["components/ui/**/*.{ts,tsx}", "components/common/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}", "utils/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@/features", "@/features/**"], message: "Shared infrastructure must not depend on business features." }],
      }],
    },
  },
  ...["auth", "cart", "products", "categories", "search", "banners", "home", "account"].map(feature => ({
    files: [`features/${feature}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ regex: `^@/features/(?!${feature}(?:/|$))[^/]+/[^/]+/`, message: "Import other features through their public index, server, or contract entry points." }],
      }],
    },
  })),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
