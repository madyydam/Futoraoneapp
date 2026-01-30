import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Ensure env vars are available in the built client bundle.
  // This prevents runtime crashes like: "Uncaught Error: supabaseUrl is required."
  // We support both Vite-prefixed vars and server-provided vars.
  const env = loadEnv(mode, process.cwd(), "");

  // Fallback: in some hosted preview environments, Vite's env loading can be skipped.
  // We defensively parse the repo-root .env (if present) to recover required values.
  const readDotEnvFallback = (): Record<string, string> => {
    try {
      // Use the vite config file location to resolve repo root.
      const here = path.dirname(fileURLToPath(import.meta.url));
      const dotEnvPath = path.resolve(here, ".env");
      if (!fs.existsSync(dotEnvPath)) return {};

      const text = fs.readFileSync(dotEnvPath, "utf8");
      const out: Record<string, string> = {};

      for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq === -1) continue;

        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();

        // Strip surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        out[key] = value;
      }

      return out;
    } catch {
      return {};
    }
  };

  const envFallback = readDotEnvFallback();

  const resolvedSupabaseUrl =
    env.VITE_SUPABASE_URL ||
    envFallback.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    envFallback.SUPABASE_URL ||
    env.PUBLIC_SUPABASE_URL ||
    "";

  const resolvedSupabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    envFallback.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    envFallback.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    envFallback.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    envFallback.SUPABASE_ANON_KEY ||
    "";

  // Also set process.env so Vite can populate import.meta.env normally.
  if (resolvedSupabaseUrl) process.env.VITE_SUPABASE_URL = resolvedSupabaseUrl;
  if (resolvedSupabaseKey) process.env.VITE_SUPABASE_PUBLISHABLE_KEY = resolvedSupabaseKey;

  return {
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    // Force values to be inlined so `import.meta.env.*` is never undefined at runtime.
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(resolvedSupabaseUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(resolvedSupabaseKey),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'app-icon.png'],
      manifest: {
        name: 'FutoraFlow',
        short_name: 'FutoraFlow',
        description: 'The Future of Social Networking for Developers',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'app-icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'app-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: 'app-icon.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'FutoraFlow Desktop'
          },
          {
            src: 'app-icon.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'FutoraFlow Mobile'
          }
        ],
        categories: ['social', 'productivity', 'developer tools'],
        shortcuts: [
          {
            name: 'Chat',
            short_name: 'Chat',
            description: 'Open Chat',
            url: '/chat',
            icons: [{ src: 'app-icon.png', sizes: '192x192' }]
          }
        ],
        iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7',
        related_applications: [],
        prefer_related_applications: false,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache images
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
              },
            },
          },
        ],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/]
      }
    })
  ].filter(Boolean),
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-tooltip', 'framer-motion'],
          utils: ['date-fns', 'clsx', 'tailwind-merge'],
          firebase: ['firebase/app', 'firebase/messaging', 'firebase/analytics']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
