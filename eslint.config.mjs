import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([".next/**", "dist/**", ".wrangler/**", "worker-configuration.d.ts"]),
  tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat["recommended-latest"] ?? reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["worker/**/*.ts", "scripts/**/*.ts", "*.config.ts"],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.node } },
  },
]);
