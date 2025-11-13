import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "dist",
      ".next",
      "apps/web/.next",
      "apps/*/dist",
      "coverage"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ["**/*.{js,jsx,cjs,mjs}"],
    languageOptions: {
      parserOptions: {
        projectService: false
      }
    }
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      react: reactPlugin
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      eqeqeq: ["error", "always"],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
      "object-curly-spacing": ["error", "always"],
      "no-trailing-spaces": "error",
      "no-tabs": "error",
      "prefer-const": "warn",
      "react/react-in-jsx-scope": "off"
    }
  },
  {
    files: ["apps/edge/**/*.ts", "packages/shared/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
);
