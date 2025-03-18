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
      "2f07b5a9-6ac0-4b2b-b498-ccde0e20673b.lovableproject.com"
    ]
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/image": path.resolve(__dirname, "./src/shims/next-image.ts"),
      "next/link": path.resolve(__dirname, "./src/shims/next-link.ts"),
      "next/navigation": path.resolve(__dirname, "./src/shims/next-navigation.ts"),
      "next/server": path.resolve(__dirname, "./src/shims/next-server.ts"),
      "next": path.resolve(__dirname, "./src/shims")
    },
  },
  optimizeDeps: {
    exclude: ['lovable-tagger'],
  },
}));