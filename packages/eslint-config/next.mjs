import base from "./base.mjs";

export default [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
