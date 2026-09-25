import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [process.env.VITEST ? null : reactRouter()].filter(Boolean),
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./app/tests/setup.ts",
  },
});
