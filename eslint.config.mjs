import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"], // Match JavaScript and TypeScript files
    languageOptions: { globals: globals.browser }, // Add custom globals
  },
  ...tseslint.configs.recommended,
  {     
    rules: { 
      "@typescript-eslint/no-explicit-any": 'off',
    }, 
  }
];