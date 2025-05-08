import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner';
import App from './App'
import './index.css'

const root = document.getElementById("root");

if (!root) {
  console.error("Root element not found!");
} else {
  try {
    console.log("Attempting to render application...");
    // Log available environment variables (safe ones only)
    console.log("Available env vars:", { 
      NEXT_PUBLIC_SUPABASE_URL: import.meta.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      NODE_ENV: import.meta.env.NODE_ENV || process.env.NODE_ENV,
      SYNC_VERSION: import.meta.env.SYNC_VERSION || process.env.SYNC_VERSION
    });
    
    createRoot(root).render(
      <>
        <App />
        <Toaster position="top-right" />
      </>
    );
    console.log("Application rendered successfully");
  } catch (error) {
    console.error("Error rendering app:", error);
    root.innerHTML = `
      <div style="padding: 20px; text-align: center; color: white; background-color: #111;">
        <h1>Something went wrong</h1>
        <p>There was an error loading the application. Please check the console for details.</p>
        <pre style="background: #222; padding: 10px; text-align: left; margin-top: 20px; overflow: auto; color: #f8f8f8; border-radius: 4px;">${error}</pre>
      </div>
    `;
  }
}
