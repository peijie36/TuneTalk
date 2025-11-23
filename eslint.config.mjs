// eslint.config.mjs
// @ts-check

import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";
import prettierRecommended from "eslint-plugin-prettier/recommended";

export default defineConfig([
  // 1) Global ignores
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.turbo/**",

      // Ignore all config/build files
      "**/next.config.*",
      "**/postcss.config.*",
      "**/tailwind.config.*",
      "**/eslint.config.*",
      "**/tsconfig.*",
      "**/*.config.*",
    ],
  },

  // 2) Core JS recommended
  js.configs.recommended,

  // 3) TypeScript recommended configs (type-aware + stylistic)
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // 4) React + TS Rules
  {
    files: ["**/*.{ts,tsx}"],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        // @ts-expect-error ESM limitation
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        JSX: true,
        React: true,
      },
    },

    plugins: {
      reactPlugin,
      next: nextPlugin,
      "@typescript-eslint": tseslint.plugin,
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    rules: {
      /** Style */
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      eqeqeq: ["error", "always"],
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
      "object-curly-spacing": ["error", "always"],
      "no-trailing-spaces": "error",
      "no-tabs": "error",
      "prefer-const": "warn",

      /** TS */
      "no-unused-vars": "off", // disabled in favor of TS version

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],

      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
      ],

      /** React */
      "react/react-in-jsx-scope": "off",

      /** Console */
      "no-console": "off",
    },
  },

  // 5) Prettier (formatting handled by Prettier + surfaced via ESLint)
  prettierRecommended,
]);
