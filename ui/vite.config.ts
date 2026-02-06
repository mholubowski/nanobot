import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.resolve(__dirname, "../nanobot/web/static"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://localhost:18790",
    },
  },
});
