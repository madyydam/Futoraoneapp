import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars from process.env (Lovable Cloud injects them directly)
  const env = loadEnv(mode, process.cwd(), "");

  // Lovable Cloud project - hardcoded fallbacks to prevent runtime crashes
  const LOVABLE_CLOUD_URL = "https://forxnefbbsqwhdfadvkk.supabase.co";
  const LOVABLE_CLOUD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcnhuZWZiYnNxd2hkZmFkdmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjE0MzUsImV4cCI6MjA3OTUzNzQzNX0.YO9cEWBmWjjtrnxwlIQ_1S-8c3vltB3i5XmLwRd4QRo";

  // Get Supabase config - prefer env vars, fallback to Lovable Cloud values
  const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || LOVABLE_CLOUD_URL;
  const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || LOVABLE_CLOUD_KEY;

  return {
    server: {
      host: "::",
      port: 8080,
    },
    // Force inline these values so they're never undefined at runtime
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(SUPABASE_KEY),
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "robots.txt", "app-icon.png"],
        manifest: {
          name: "FutoraFlow",
          short_name: "FutoraFlow",
          description: "The Future of Social Networking for Developers",
          theme_color: "#0f172a",
          background_color: "#0f172a",
          display: "standalone",
          orientation: "portrait",
          icons: [
            { src: "app-icon.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
            { src: "app-icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
          categories: ["social", "productivity", "developer tools"],
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
          ],
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/api/],
        },
      }),
    ].filter(Boolean),
    build: {
      minify: "esbuild",
      target: "esnext",
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-popover", "@radix-ui/react-tooltip", "framer-motion"],
            utils: ["date-fns", "clsx", "tailwind-merge"],
            supabase: ["@supabase/supabase-js"],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom", "@supabase/supabase-js"],
    },
  };
});
