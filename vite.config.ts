import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // In some hosted preview environments, `import.meta.env.VITE_*` may end up undefined
  // unless we explicitly inline the values at build time.
  // Use `envDir: __dirname` (below) to ensure the preview runtime loads env vars
  // from the actual project root.
  const env = loadEnv(mode, __dirname, "VITE_");

  // Final fallback: parse repo-root `.env` ourselves (some preview runtimes don't
  // propagate env vars into Vite reliably, but the file is present in the workspace).
  const envFileFallback: Record<string, string> = (() => {
    try {
      const p = path.resolve(__dirname, ".env");
      if (!fs.existsSync(p)) return {};
      const text = fs.readFileSync(p, "utf8");
      const out: Record<string, string> = {};
      for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const i = line.indexOf("=");
        if (i === -1) continue;
        const key = line.slice(0, i).trim();
        let value = line.slice(i + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        out[key] = value;
      }
      return out;
    } catch {
      return {};
    }
  })();

  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    envFileFallback.VITE_SUPABASE_URL ||
    "";
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    envFileFallback.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "";

  // Only inline when present; otherwise let Vite's normal import.meta.env injection work.
  const define: Record<string, string> = {};
  if (supabaseUrl) define["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(supabaseUrl);
  if (supabasePublishableKey)
    define["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(supabasePublishableKey);

  return {
    envDir: __dirname,
    server: {
      host: "::",
      port: 8080,
    },
    define,
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
            {
              src: "app-icon.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable",
            },
            {
              src: "app-icon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
          screenshots: [
            {
              src: "app-icon.png",
              sizes: "512x512",
              type: "image/png",
              form_factor: "wide",
              label: "FutoraFlow Desktop",
            },
            {
              src: "app-icon.png",
              sizes: "512x512",
              type: "image/png",
              form_factor: "narrow",
              label: "FutoraFlow Mobile",
            },
          ],
          categories: ["social", "productivity", "developer tools"],
          shortcuts: [
            {
              name: "Chat",
              short_name: "Chat",
              description: "Open Chat",
              url: "/chat",
              icons: [{ src: "app-icon.png", sizes: "192x192" }],
            },
          ],
          iarc_rating_id: "e84b072d-71b3-4d3e-86ae-31a8ce4e53b7",
          related_applications: [],
          prefer_related_applications: false,
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Cache images
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "images",
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
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
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            ui: [
              "@radix-ui/react-dialog",
              "@radix-ui/react-popover",
              "@radix-ui/react-tooltip",
              "framer-motion",
            ],
            utils: ["date-fns", "clsx", "tailwind-merge"],
            firebase: ["firebase/app", "firebase/messaging", "firebase/analytics"],
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
  };
});
