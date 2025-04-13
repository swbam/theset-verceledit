import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Type for global usage of Supabase client in development
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

// --- Client-side Supabase Client ---
// Use Vite's import.meta.env for client-side variables (prefixed with VITE_)
const supabaseUrlClient = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKeyClient = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrlClient) {
  throw new Error("Missing environment variable: VITE_SUPABASE_URL");
}
if (!supabaseAnonKeyClient) {
  throw new Error("Missing environment variable: VITE_SUPABASE_ANON_KEY");
}

// Create the client-side instance
// Use a function to initialize to potentially leverage global cache in dev
function createSupabaseClient(): SupabaseClient {
   console.log('[Client] Creating Supabase client instance...');
   return createClient(supabaseUrlClient, supabaseAnonKeyClient, {
     auth: {
       persistSession: true,
       autoRefreshToken: true,
       detectSessionInUrl: true,
     },
     global: {
       // Optional: Add headers or other global config if needed
       // headers: { 'x-app-name': 'theset-web' },
     }
   });
}

// Initialize client-side supabase instance, using global cache in development
export const supabase: SupabaseClient =
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'development'
    ? globalForSupabase.supabase
    : undefined) ?? createSupabaseClient();

// Cache the client-side connection in development
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  globalForSupabase.supabase = supabase;
}

// --- Server-side Admin Client ---
// This function is intended ONLY for server-side use (e.g., API routes, server components)
// It accesses the service role key directly from process.env
export const adminClient = (): SupabaseClient => {
  // These variables are accessed ONLY when adminClient() is called on the server
  const supabaseUrlServer = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || supabaseUrlClient; // Fallback needed?
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrlServer) {
     console.error('[adminClient] Missing Supabase URL environment variable (NEXT_PUBLIC_SUPABASE_URL or VITE_SUPABASE_URL).');
     throw new Error("Missing Supabase URL for admin client.");
  }
  if (!serviceKey) {
    console.error('[adminClient] Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. Ensure it is set in the server environment.');
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY required for admin client.");
  }

  try {
    // Create a new admin client instance each time (or implement server-side caching if needed)
    console.log('[Server] Creating Supabase admin client instance...');
    return createClient(supabaseUrlServer, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });
  } catch (error) {
    console.error('[Server] Error creating admin client:', error);
    throw new Error(`Failed to create admin client: ${error instanceof Error ? error.message : String(error)}`);
  }
};

console.log(`[db.ts] Supabase client initialized. URL: ${supabaseUrlClient}`);
