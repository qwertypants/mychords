import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: "./",
  plugins: [react(), VitePWA({
    registerType: "prompt",
    injectRegister: false,
    manifest: {
      id: "./",
      name: "MyChords",
      short_name: "MyChords",
      description: "Your offline guitar chord notebook.",
      start_url: "./",
      scope: "./",
      display: "standalone",
      background_color: "#F3F6FB",
      theme_color: "#17243B",
      icons: [
        { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    workbox: {
      cacheId: "mychords",
      globPatterns: ["**/*.{html,js,css,json,woff,woff2,mp3,svg,png,txt,webmanifest}"],
      importScripts: ["update-worker.js"],
      // Activate only after the waiting worker checks for other windows.
      skipWaiting: false,
      clientsClaim: false,
      // Activation prunes this precache. Broad legacy-cache cleanup can also
      // match a neighboring app's scope when this app runs at the origin root.
      cleanupOutdatedCaches: false,
      navigateFallback: "index.html",
      navigateFallbackDenylist: [/\/credits\.html$/, /\/licenses\//, /\/audio\//, /\/icons\//],
    },
    devOptions: { enabled: false },
  })],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});
