// eslint.config.mjs
// @ts-check

import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import eslintNextPlugin from "@next/eslint-plugin-next";
import globals from "globals";

export default defineConfig([
	// 1) Global ignores
	{
		ignores: ["**/.next/**", "**/node_modules/**", "**/dist/**", "**/.turbo/**"],
	},

	// 2) Base JS recommended rules
	js.configs.recommended,

	// 3) TypeScript + React + Next configuration
	{
		files: ["**/*.{ts,tsx}"],

		languageOptions: {
			parser: ts.parser,
			parserOptions: {
				projectService: true,
				// @ts-expect-error - ESM limitation in ESLint
				tsconfigRootDir: import.meta.dirname,
			},
			globals: {
				...globals.browser, // window, document, fetch, etc.
				...globals.node, // process, __dirname, etc.
				JSX: true, // JSX namespace for TSX
				React: true, // global React namespace (optional)
			},
		},

		plugins: {
			"react": reactPlugin,
			"next": eslintNextPlugin,
			"@typescript-eslint": ts.plugin,
		},

		settings: {
			react: {
				version: "detect",
			},
		},

		rules: {
			// Style rules
			"quotes": ["error", "double", { avoidEscape: true }],
			"semi": ["error", "always"],
			"eqeqeq": ["error", "always"],
			"no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
			"object-curly-spacing": ["error", "always"],
			"no-trailing-spaces": "error",
			"no-tabs": "error",
			"prefer-const": "warn",

			// Console & undefined handling
			"no-console": "off", // allow console

			// TypeScript rules
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
					format: ["PascalCase"],
					selector: "typeLike",
				},
			],

			// React
			"react/react-in-jsx-scope": "off",
		},
	},
]);
