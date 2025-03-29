import { createClient } from '@supabase/supabase-js';

// Type for global usage of Supabase client
const globalForSupabase = globalThis as unknown as {
  supabase: ReturnType<typeof createClient> | undefined;
};

// Get environment variables - using VITE_ prefix for Vite compatibility
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ||
                    "https://kzjnkqeosrycfpxjwhil.supabase.co";

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
                         "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2ODM3ODMsImV4cCI6MjA1ODI1OTc4M30.KOriVTUxlnfiBpWmVrlO4xHM7nniizLgXQ49f2K22UM";

const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjY4Mzc4MywiZXhwIjoyMDU4MjU5NzgzfQ.4-ITsc97-Ts7gy3e6RhjIbCf2awTWdjaG3zXCxkwJpI";

// Log the Supabase configuration for debugging
console.log('[Server] Supabase URL:', SUPABASE_URL);
console.log('[Server] Supabase Anon Key available:', SUPABASE_ANON_KEY ? 'Yes' : 'No');
console.log('[Server] Supabase Service Role Key available:', SUPABASE_SERVICE_ROLE_KEY ? 'Yes' : 'No');

// Create client with connection pooling and optimized settings
let supabaseClient;
try {
  supabaseClient = globalForSupabase.supabase ?? createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'x-connection-pool': 'vite-pool',
        },
      }
    }
  );
  console.log('[Server] Supabase client created successfully');
} catch (error) {
  console.error('[Server] Error creating Supabase client:', error);
  // Create a fallback client with minimal configuration
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = supabaseClient;

// Cache the connection in development
// Use process.env.NODE_ENV to check for development mode on the server
if (process.env.NODE_ENV === 'development') {
  globalForSupabase.supabase = supabase;
}

// Service role client for admin operations (use with caution)
export const adminClient = () => {
  try {
    return createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );
  } catch (error) {
    console.error('[Server] Error creating admin client:', error);
    // Return a fallback client
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
};