import { createClient } from '@supabase/supabase-js';

// Type for global usage of Supabase client
const globalForSupabase = globalThis as unknown as {
  supabase: ReturnType<typeof createClient> | undefined;
};

// Get environment variables with Vite prefix
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create client with connection pooling and optimized settings
export const supabase = globalForSupabase.supabase ?? createClient(
  SUPABASE_URL!,
  SUPABASE_ANON_KEY!,
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

// Cache the connection in development
if (import.meta.env.DEV) {
  globalForSupabase.supabase = supabase;
}

// Service role client for admin operations (use with caution)
export const adminClient = () => createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
);