import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["work/**", "sources/**", "node_modules/**", "docs/validation/**"],
  },
  {
    files: [
      "src/**/*.js",
      "generated/**/*.js",
      "tests/**/*.js",
      "examples/**/*.js",
      "tools/**/*.mjs",
      "eslint.config.js",
    ],
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "error",
        {
          args: "none",
          caughtErrors: "none",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    languageOptions: {
      globals: {
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        structuredClone: "readonly",
        performance: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
  },
  {
    files: ["src/adapters/**/*.js", "src/packs/**/*.js", "src/app.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      "tools/**/*.mjs",
      "tests/**/*.js",
      "examples/**/*.js",
      "eslint.config.js",
    ],
    languageOptions: { globals: globals.node },
  },
];
