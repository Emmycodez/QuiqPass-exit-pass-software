import { reactRouter } from "@react-router/dev/vite";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    VitePWA({
      // Use injectManifest so we control the SW (push handlers, etc.)
      strategies: "injectManifest",
      srcDir: "app",
      filename: "sw.ts",

      // Don't auto-inject the registration script — we register manually
      // in root.tsx so it works correctly with SSR.
      injectRegister: false,

      injectManifest: {
        // Only precache static assets — NOT html/navigation (SSR handles those)
        globPatterns: ["**/*.{js,css,ico,png,jpg,jpeg,svg,woff,woff2}"],
      },

      manifest: {
        name: "QuiqPass",
        short_name: "QuiqPass",
        description: "Digital exit pass management for university students",
        theme_color: "#6366f1",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            // Replace with a proper 192×192 PNG for production
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            // Replace with a proper 512×512 PNG for production
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      devOptions: {
        // Set to true to test the SW during development
        enabled: false,
      },
    }),
  ],
});
