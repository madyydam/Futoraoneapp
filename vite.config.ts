import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars from process.env (Vite handles VITE_ prefixed vars automatically from .env)
  const env = loadEnv(mode, process.cwd(), "");

  // Use values from .env or process.env, with empty string as safe default
  const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    // Only define value if we want to force them (useful for certain deployment environments)
    // but typically Vite handles this. We'll keep it but point to the correct variables.
    // define: {
    //   "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
    //   "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(SUPABASE_KEY),
    // },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.png", "robots.txt", "app-icon.png"],
        manifest: {
          name: "FutoraOne",
          short_name: "FutoraOne",
          description: "The Future of Social Networking for Developers",
          theme_color: "#0f172a",
          background_color: "#0f172a",
          display: "standalone",
          orientation: "portrait",
          icons: [
            { src: "app-icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "app-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "favicon.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          ],
          categories: ["social", "productivity", "developer tools"],
          screenshots: [
            {
              src: "futora-phoenix.png",
              sizes: "1080x1920",
              type: "image/png",
              form_factor: "narrow",
              label: "FutoraOne Mobile Feed"
            },
            {
              src: "futora-phoenix.png",
              sizes: "1920x1080",
              type: "image/png",
              form_factor: "wide",
              label: "FutoraOne Desktop Experience"
            }
          ],
          shortcuts: [
            {
              name: "Feed",
              short_name: "Feed",
              description: "View latest technical updates",
              url: "/feed",
              icons: [{ src: "favicon.png", sizes: "192x192" }]
            },
            {
              name: "Create Post",
              short_name: "Create",
              description: "Share a new insight",
              url: "/create-post",
              icons: [{ src: "favicon.png", sizes: "192x192" }]
            },
            {
              name: "AI Mentor",
              short_name: "Mentor",
              description: "Chat with the AI Mentor",
              url: "/ai-mentor",
              icons: [{ src: "favicon.png", sizes: "192x192" }]
            }
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "images",
                expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
              },
            },
            {
              urlPattern: /^https:\/\/vunrtqpxoqwuvofkqvuz\.supabase\.co\/rest\/v1\/.*/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "supabase-api-cache",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 24 hours
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api/, /^\/functions/],
        },
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
        },
      }),
    ].filter(Boolean),
    build: {
      minify: "esbuild",
      target: "esnext",
      chunkSizeWarningLimit: 1200,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom", "@supabase/supabase-js", "firebase/app", "firebase/auth"],
    },
  };
});
