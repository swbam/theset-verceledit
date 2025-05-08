import { createServerClient as _createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/integrations/supabase/types'
import { getRequiredEnv } from '@/lib/utils/checkEnv'

/**
 * Creates a Supabase client for server-side use
 */
export function createServerClient() {
  const cookieStore = cookies()

  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

/**
 * Creates a Supabase admin client with the service role key
 * WARNING: This client bypasses RLS and should only be used in server contexts
 */
export function createServerSupabaseAdmin() {
  return _createServerClient<Database>(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // For admin client, we don't need to set cookies typically
        },
        remove(name: string, options: any) {
          // For admin client, we don't need to remove cookies typically
        },
      },
    }
  );
} 