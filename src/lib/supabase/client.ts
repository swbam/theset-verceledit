import { createClient } from '@supabase/supabase-js';
import { getRequiredEnv } from '@/lib/utils/checkEnv';

// Type for the Database schema
// Ideally this would be imported from a generated types file
// import { Database } from '@/integrations/supabase/types';

/**
 * Creates a Supabase client for browser use
 * Uses NEXT_PUBLIC_ environment variables
 */
export function createBrowserClient() {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  // Create and return the Supabase client instance
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  );
}

/**
 * Get the Supabase URL from environment variables
 */
export function getSupabaseUrl(): string {
  return getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
}

/**
 * Singleton instance of the Supabase client for use in server components
 * Note: In server components, it's better to use createServerClient from @supabase/ssr
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get or create the singleton Supabase client
 */
export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient();
  }
  return browserClient;
} 