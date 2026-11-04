import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In Figma (Code Layer / Make) the runtime sets FIGMA, PORT and FIGMA_DEV_SERVER_HOST.
const inFigma = Boolean(process.env.FIGMA);

export default defineConfig({
  plugins: [react()],
  base: process.env.FIGMA_PUBLIC_URL || "./",
  server: {
    port: inFigma ? Number(process.env.PORT) : 5173,
    host: inFigma ? process.env.FIGMA_DEV_SERVER_HOST || "0.0.0.0" : undefined,
    strictPort: inFigma,
    allowedHosts: inFigma ? true : undefined,
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 4096,
  },
});
