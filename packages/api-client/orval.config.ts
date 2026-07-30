import { defineConfig } from "orval";

export default defineConfig({
  nodex: {
    input: "../../artifacts/openapi.json",
    output: {
      target: "./src/generated/nodex.ts",
      client: "react-query",
      mode: "single",
      override: {
        mutator: {
          path: "./src/mutator.ts",
          name: "nodexFetch",
        },
      },
    },
  },
});
