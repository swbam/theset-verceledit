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
    ]
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
          // UI components chunk
          ui: [
            '@radix-ui',
            'lucide-react',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],
          // API services chunk
          api: [
            'src/lib/api',
            'src/lib/ticketmaster.ts',
            'src/integrations/supabase'
          ],
          // Auth related code
          auth: [
            'src/contexts/auth',
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
