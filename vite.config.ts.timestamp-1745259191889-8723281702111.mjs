// vite.config.ts
import { defineConfig } from "file:///Users/seth/theset-vercel/node_modules/.pnpm/vite@5.4.18_@types+node@22.14.1_lightningcss@1.29.2/node_modules/vite/dist/node/index.js";
import react from "file:///Users/seth/theset-vercel/node_modules/.pnpm/@vitejs+plugin-react-swc@3.9.0_vite@5.4.18_@types+node@22.14.1_lightningcss@1.29.2_/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///Users/seth/theset-vercel/node_modules/.pnpm/lovable-tagger@1.1.8_vite@5.4.18_@types+node@22.14.1_lightningcss@1.29.2_/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/Users/seth/theset-vercel";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "2f07b5a9-6ac0-4b2b-b498-ccde0e20673b.lovableproject.com",
      // Add wildcards to allow any lovable project domain
      "*.lovableproject.com"
    ]
    // proxy: { ... } // Removed incorrect proxy setting
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  // Add define to handle process.env variables in browser
  define: {
    "process.env": {
      // Map Next.js environment variables to Vite format
      NEXT_PUBLIC_SUPABASE_URL: JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY),
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || mode)
    }
  },
  build: {
    // Increase the warning limit to avoid unnecessary warnings
    chunkSizeWarningLimit: 1e3,
    rollupOptions: {
      output: {
        // Manually split chunks for better performance
        manualChunks: {
          // Vendor chunk for third-party libraries
          vendor: [
            "react",
            "react-dom",
            "react-router-dom",
            "@supabase/supabase-js",
            "@tanstack/react-query"
          ],
          // UI components chunk - individual Radix packages instead of '@radix-ui'
          ui: [
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-dialog",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-slot",
            "lucide-react",
            "class-variance-authority",
            "clsx",
            "tailwind-merge"
          ],
          // API services chunk
          api: [
            "src/lib/api/index.ts",
            "src/lib/ticketmaster.ts",
            "src/integrations/supabase/client.ts"
          ],
          // Auth related code
          auth: [
            "src/contexts/auth/index.ts",
            "src/pages/Auth.tsx",
            "src/pages/AuthCallback.tsx"
          ]
        }
      }
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js"
    ]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvc2V0aC90aGVzZXQtdmVyY2VsXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvc2V0aC90aGVzZXQtdmVyY2VsL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9zZXRoL3RoZXNldC12ZXJjZWwvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIGFsbG93ZWRIb3N0czogW1xuICAgICAgXCIyZjA3YjVhOS02YWMwLTRiMmItYjQ5OC1jY2RlMGUyMDY3M2IubG92YWJsZXByb2plY3QuY29tXCIsXG4gICAgICAvLyBBZGQgd2lsZGNhcmRzIHRvIGFsbG93IGFueSBsb3ZhYmxlIHByb2plY3QgZG9tYWluXG4gICAgICBcIioubG92YWJsZXByb2plY3QuY29tXCJcbiAgICBdLFxuICAgIC8vIHByb3h5OiB7IC4uLiB9IC8vIFJlbW92ZWQgaW5jb3JyZWN0IHByb3h5IHNldHRpbmdcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgbW9kZSA9PT0gJ2RldmVsb3BtZW50JyAmJlxuICAgIGNvbXBvbmVudFRhZ2dlcigpLFxuICBdLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxuICAvLyBBZGQgZGVmaW5lIHRvIGhhbmRsZSBwcm9jZXNzLmVudiB2YXJpYWJsZXMgaW4gYnJvd3NlclxuICBkZWZpbmU6IHtcbiAgICAncHJvY2Vzcy5lbnYnOiB7XG4gICAgICAvLyBNYXAgTmV4dC5qcyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdG8gVml0ZSBmb3JtYXRcbiAgICAgIE5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTDogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIHx8IGltcG9ydC5tZXRhLmVudj8uVklURV9TVVBBQkFTRV9VUkwpLFxuICAgICAgTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVk6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX0FOT05fS0VZIHx8IGltcG9ydC5tZXRhLmVudj8uVklURV9TVVBBQkFTRV9BTk9OX0tFWSksXG4gICAgICBOT0RFX0VOVjogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgbW9kZSksXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICAvLyBJbmNyZWFzZSB0aGUgd2FybmluZyBsaW1pdCB0byBhdm9pZCB1bm5lY2Vzc2FyeSB3YXJuaW5nc1xuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgLy8gTWFudWFsbHkgc3BsaXQgY2h1bmtzIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgLy8gVmVuZG9yIGNodW5rIGZvciB0aGlyZC1wYXJ0eSBsaWJyYXJpZXNcbiAgICAgICAgICB2ZW5kb3I6IFtcbiAgICAgICAgICAgICdyZWFjdCcsXG4gICAgICAgICAgICAncmVhY3QtZG9tJyxcbiAgICAgICAgICAgICdyZWFjdC1yb3V0ZXItZG9tJyxcbiAgICAgICAgICAgICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnLFxuICAgICAgICAgICAgJ0B0YW5zdGFjay9yZWFjdC1xdWVyeSdcbiAgICAgICAgICBdLFxuICAgICAgICAgIC8vIFVJIGNvbXBvbmVudHMgY2h1bmsgLSBpbmRpdmlkdWFsIFJhZGl4IHBhY2thZ2VzIGluc3RlYWQgb2YgJ0ByYWRpeC11aSdcbiAgICAgICAgICB1aTogW1xuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10YWJzJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcCcsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXBvcG92ZXInLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zbG90JyxcbiAgICAgICAgICAgICdsdWNpZGUtcmVhY3QnLFxuICAgICAgICAgICAgJ2NsYXNzLXZhcmlhbmNlLWF1dGhvcml0eScsXG4gICAgICAgICAgICAnY2xzeCcsXG4gICAgICAgICAgICAndGFpbHdpbmQtbWVyZ2UnXG4gICAgICAgICAgXSxcbiAgICAgICAgICAvLyBBUEkgc2VydmljZXMgY2h1bmtcbiAgICAgICAgICBhcGk6IFtcbiAgICAgICAgICAgICdzcmMvbGliL2FwaS9pbmRleC50cycsXG4gICAgICAgICAgICAnc3JjL2xpYi90aWNrZXRtYXN0ZXIudHMnLFxuICAgICAgICAgICAgJ3NyYy9pbnRlZ3JhdGlvbnMvc3VwYWJhc2UvY2xpZW50LnRzJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgLy8gQXV0aCByZWxhdGVkIGNvZGVcbiAgICAgICAgICBhdXRoOiBbXG4gICAgICAgICAgICAnc3JjL2NvbnRleHRzL2F1dGgvaW5kZXgudHMnLFxuICAgICAgICAgICAgJ3NyYy9wYWdlcy9BdXRoLnRzeCcsXG4gICAgICAgICAgICAnc3JjL3BhZ2VzL0F1dGhDYWxsYmFjay50c3gnXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICAvLyBPcHRpbWl6ZSBkZXBlbmRlbmNpZXNcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogW1xuICAgICAgJ3JlYWN0JyxcbiAgICAgICdyZWFjdC1kb20nLFxuICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxuICAgICAgJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcydcbiAgICBdXG4gIH1cbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlAsU0FBUyxvQkFBb0I7QUFDMVIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUhoQyxJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLGNBQWM7QUFBQSxNQUNaO0FBQUE7QUFBQSxNQUVBO0FBQUEsSUFDRjtBQUFBO0FBQUEsRUFFRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sU0FBUyxpQkFDVCxnQkFBZ0I7QUFBQSxFQUNsQixFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBRUEsUUFBUTtBQUFBLElBQ04sZUFBZTtBQUFBO0FBQUEsTUFFYiwwQkFBMEIsS0FBSyxVQUFVLFFBQVEsSUFBSSw0QkFBNEIsWUFBWSxLQUFLLGlCQUFpQjtBQUFBLE1BQ25ILCtCQUErQixLQUFLLFVBQVUsUUFBUSxJQUFJLGlDQUFpQyxZQUFZLEtBQUssc0JBQXNCO0FBQUEsTUFDbEksVUFBVSxLQUFLLFVBQVUsUUFBUSxJQUFJLFlBQVksSUFBSTtBQUFBLElBQ3ZEO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUEsSUFFTCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUE7QUFBQSxRQUVOLGNBQWM7QUFBQTtBQUFBLFVBRVosUUFBUTtBQUFBLFlBQ047QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBO0FBQUEsVUFFQSxJQUFJO0FBQUEsWUFDRjtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFVBQ0Y7QUFBQTtBQUFBLFVBRUEsS0FBSztBQUFBLFlBQ0g7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFVBQ0Y7QUFBQTtBQUFBLFVBRUEsTUFBTTtBQUFBLFlBQ0o7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFVBQ0Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUVBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
