import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must come before the React plugin.
    tanstackRouter({ autoCodeSplitting: true, target: "react" }),
    react(),
    tailwindcss(),
    VitePWA({
      // Custom service worker so it can handle Web Push.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        background_color: "#0f172a",
        description: "จำวันหมดอายุของของในบ้าน ผ่าน LINE และเว็บ",
        display: "standalone",
        icons: [
          {
            purpose: "any",
            sizes: "192x192",
            src: "pwa-192x192.png",
            type: "image/png",
          },
          {
            purpose: "any",
            sizes: "512x512",
            src: "pwa-512x512.png",
            type: "image/png",
          },
          {
            purpose: "maskable",
            sizes: "512x512",
            src: "maskable-icon-512x512.png",
            type: "image/png",
          },
          {
            purpose: "any",
            sizes: "any",
            src: "icon.svg",
            type: "image/svg+xml",
          },
        ],
        lang: "th",
        name: "BestBefore",
        short_name: "BestBefore",
        start_url: "/",
        theme_color: "#0f172a",
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
      devOptions: {
        enabled: true,
        navigateFallback: "index.html",
        type: "module",
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
