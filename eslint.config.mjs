import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Desativar warnings de variáveis não utilizadas
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      
      // Desativar warnings de hooks
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",
      
      // Desativar warnings de tipos any
      "@typescript-eslint/no-explicit-any": "off",
      
      // Desativar warnings de elementos img
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;