// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/**",
      ".expo/**",
      "node_modules/**",
      "ios/**",
      "android/**",
      "*.config.js",
      "*.config.ts",
      "drizzle/**",
    ],
  },
  {
    rules: {
      // 未使用変数は_で始まる場合は許可
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // console.logは開発中は許可（prodビルド時にTreeShakeされる）
      "no-console": "off",
      // React Hooksの依存配列は警告のまま
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);
