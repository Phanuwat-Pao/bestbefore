import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

// Ultracite's preset is intentionally strict. We relax a small, curated set of
// style rules that fight idiomatic React (TanStack Router) and Convex patterns:
// - function declarations for components/handlers (func-style, no-use-before-define)
// - conditional rendering with ternaries in JSX (eslint + unicorn no-nested-ternary;
//   unicorn's wants parens that oxfmt strips, so they must both be off to converge)
// - sequential awaits inside Convex transactions / small UI loops (no-await-in-loop)
// - the inherently branchy webhook ingest dispatcher (complexity)
// - inline comments (no-inline-comments)
export default defineConfig({
  extends: [core],
  ignorePatterns: core.ignorePatterns,
  rules: {
    complexity: "off",
    "func-style": "off",
    "no-await-in-loop": "off",
    "no-bitwise": "off",
    "no-inline-comments": "off",
    "no-nested-ternary": "off",
    "no-use-before-define": "off",
    "sort-keys": "off",
    "unicorn/no-nested-ternary": "off",
  },
});
