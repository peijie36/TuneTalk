// eslint.config.mjs
// @ts-check

import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import tseslint from "typescript-eslint";

export default tseslint.config(
	// 1) Global ignores
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"apps/*/dist/**",
			"**/.turbo/**",
			"**/coverage/**",
		],
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
	},

	// 2) Base JS rules (they also apply to TS via the TS parser)
	js.configs.recommended,

	// 3) TypeScript (type-checked) + style + React
	{
		files: ["**/*.{ts,tsx}"],
		extends: [
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
		],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			react: reactPlugin,
		},
		settings: {
			react: {
				version: "detect",
			},
		},
		rules: {
			// your style + correctness rules
			"quotes": ["error", "double", { avoidEscape: true }],
			"semi": ["error", "always"],
			"eqeqeq": ["error", "always"],
			"no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
			"object-curly-spacing": ["error", "always"],
			"no-trailing-spaces": "error",
			"no-tabs": "error",
			"prefer-const": "warn",

			// TS-specific
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],

			// React
			"react/react-in-jsx-scope": "off",
		},
	},

	// 4) Edge + shared: slightly relaxed `any`
	{
		files: ["apps/edge/**/*.ts", "packages/shared/**/*.ts"],
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
		},
	}
);
