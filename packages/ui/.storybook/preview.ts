import "../src/styles/global.css";
import type { Preview } from "@storybook/nextjs-vite";

const preview: Preview = {
  parameters: {
    a11y: { test: "todo" },
    viewport: {
      defaultViewport: "mobile1",
    },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#f8fafc" },
        { name: "dark", value: "#090e19" },
      ],
    },
  },
};

export default preview;
