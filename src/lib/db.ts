import { createClient } from '@supabase/supabase-js';

// Type for global usage of Supabase client
const globalForSupabase = globalThis as unknown as {
  supabase: ReturnType<typeof createClient> | undefined;
};

// Get environment variables - using VITE_ prefix for Vite compatibility
// Get environment variables
// VITE_ prefix exposes them client-side (needed for URL and Anon Key)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Service Role Key should ONLY be accessed server-side (e.g., API routes, Node scripts)
// Use process.env for server-side environments. Ensure this variable is NOT prefixed with VITE_
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate essential environment variables
if (!SUPABASE_URL) {
  throw new Error("Missing environment variable: VITE_SUPABASE_URL");
}
if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing environment variable: VITE_SUPABASE_ANON_KEY");
}
// Service role key is only strictly required for the adminClient, check there.

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
// Service role client for admin operations (use ONLY server-side)
export const adminClient = () => {
  // Ensure Service Role Key is available in the server environment
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Server] Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. Admin client cannot be created.');
    // Depending on strictness, you might throw an error or return a non-functional client/null
    // Throwing an error is safer to prevent unexpected behavior.
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY required for admin client.");
  }

  try {
    // Use the server-side fetched key
    return createClient(
      SUPABASE_URL!, // Already validated above
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
    // Re-throw or handle appropriately - avoid returning a potentially broken client
    throw new Error(`Failed to create admin client: ${error instanceof Error ? error.message : String(error)}`);
  }
};