import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "2f07b5a9-6ac0-4b2b-b498-ccde0e20673b.lovableproject.com",
      // Add wildcards to allow any lovable project domain
      "*.lovableproject.com"
    ],
    // proxy: { ... } // Removed incorrect proxy setting
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Add define to handle process.env variables in browser
  define: {
    'process.env': {
      // Map Next.js environment variables to Vite format
      NEXT_PUBLIC_SUPABASE_URL: JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY),
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || mode),
    },
  },
  build: {
    // Increase the warning limit to avoid unnecessary warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manually split chunks for better performance
        manualChunks: {
          // Vendor chunk for third-party libraries
          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
            '@supabase/supabase-js',
            '@tanstack/react-query'
          ],
          // UI components chunk - individual Radix packages instead of '@radix-ui'
          ui: [
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            'lucide-react',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],
          // API services chunk
          api: [
            'src/lib/api/index.ts',
            'src/lib/ticketmaster.ts',
            'src/integrations/supabase/client.ts'
          ],
          // Auth related code
          auth: [
            'src/contexts/auth/index.ts',
            'src/pages/Auth.tsx',
            'src/pages/AuthCallback.tsx'
          ]
        }
      }
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js'
    ]
  }
}));
