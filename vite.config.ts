import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: false }),
    react(),
    tailwindcss(),
    viteSingleFile(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
});
