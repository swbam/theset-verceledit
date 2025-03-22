import { createClient } from '@supabase/supabase-js';

// Type for global usage of Supabase client
const globalForSupabase = globalThis as unknown as {
  supabase: ReturnType<typeof createClient> | undefined;
};

// Create client with connection pooling and optimized settings
export const supabase = globalForSupabase.supabase ?? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public',
      pool: { min: 2, max: 10 },
    },
    global: {
      headers: {
        'x-connection-pool': 'nextjs-pool',
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Cache the connection in development
if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase;
}

// Service role client for admin operations (use with caution)
export const adminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
); 