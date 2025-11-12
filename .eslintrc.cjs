module.exports = {
  root: true,
  ignorePatterns: ["node_modules", "dist", ".next"],
  env: {
    es2022: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.base.json"],
    tsconfigRootDir: __dirname
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  rules: {
    quotes: ["error", "double", { avoidEscape: true }],
    semi: ["error", "always"],
    eqeqeq: ["error", "always"],
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "react/react-in-jsx-scope": "off",
    "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
    "object-curly-spacing": ["error", "always"],
    "no-trailing-spaces": "error",
    "no-tabs": "error",
    "prefer-const": "warn"
  },
  overrides: [
    {
      files: ["apps/edge/**/*.ts", "packages/shared/**/*.ts"],
      parserOptions: {
        project: ["tsconfig.base.json"],
        tsconfigRootDir: __dirname
      },
      env: {
        node: true
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "warn"
      }
    }
  ]
};
