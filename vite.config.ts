import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Map environment variables for compatibility
  const processEnv = {
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY),
    'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || mode),
  };
  
  // Merge all env variables to make them available to Vite
  Object.keys(env).forEach(key => {
    if (key.startsWith('VITE_') || key.startsWith('NEXT_PUBLIC_')) {
      processEnv[`process.env.${key}`] = JSON.stringify(env[key]);
    }
  });

  return {
    server: {
      host: "::",
      port: parseInt(env.VITE_APP_PORT || '8080'),
      allowedHosts: true,
      hmr: {
        overlay: true,
      },
    },
    plugins: [
      react(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: processEnv,
    build: {
      chunkSizeWarningLimit: 1000,
      sourcemap: mode !== 'production',
      cssCodeSplit: true,
      minify: mode === 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: [
              'react',
              'react-dom',
              'react-router-dom',
              '@supabase/supabase-js',
              '@tanstack/react-query'
            ]
          }
        }
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@radix-ui/react-tabs',
        '@tanstack/react-query',
        'date-fns'
      ],
      exclude: []
    },
    cacheDir: '.vite-cache',
  }
});
