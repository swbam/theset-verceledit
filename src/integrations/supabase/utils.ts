import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
// Removed: import { cookies } from 'next/headers';
import { createServerActionClient } from './server-actions-client';
export { createServerActionClient }; // Re-export for backward compatibility

import { clientConfig, serverConfig, validateClientConfig, validateServerConfig } from '@/integrations/config';

// --- Environment Variables ---
// Use values from the central config
const SUPABASE_URL = clientConfig.supabase.url;
const SUPABASE_ANON_KEY = clientConfig.supabase.anonKey;

// Validate client config on import (safe for client/server)
validateClientConfig();

// --- Client-Side Client (for Vite Components) ---
export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase URL or Anon Key is missing. Check environment variables.');
    // Return a dummy client or throw an error, depending on desired behavior
    throw new Error('Supabase URL or Anon Key is missing.');
  }
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

// Removed createServerActionClient function - moved to server-actions-client.ts
/*
export function createServerActionClient() {
  // ... implementation removed ...
}
*/

// --- Server-Side Client for Next.js API Routes ---
export function createServerSupabaseClient({ req, res }: { req: any; res: any }) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase URL or Anon Key is missing. Check environment variables.');
    throw new Error('Supabase URL or Anon Key is missing.');
  }
  
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return req.cookies?.[name];
        },
        set(name: string, value: string, options: CookieOptions) {
          res.setHeader('Set-Cookie', `${name}=${value}; Path=${options.path || '/'}; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''} SameSite=${options.sameSite || 'Lax'}`);
        },
        remove(name: string, options: CookieOptions) {
          res.setHeader('Set-Cookie', `${name}=; Path=${options.path || '/'}; Max-Age=0; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''} SameSite=${options.sameSite || 'Lax'}`);
        },
      },
    }
  );
}

// --- Server-Side Client (for API Route Handlers - req/res pattern) ---
// Use this version if you are working within traditional Next.js API route handlers
// that receive `req` and `res` objects.
export function createRouteHandlerClient(req: any, res: any) { // Use appropriate types for req/res
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase URL or Anon Key is missing. Check environment variables.');
    throw new Error('Supabase URL or Anon Key is missing.');
  }
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          // Adapt cookie reading based on your API framework (e.g., using cookie parser)
          return req.cookies?.[name]; 
        },
        set(name: string, value: string, options: CookieOptions) {
          // Adapt cookie setting based on your API framework (e.g., using res.cookie)
          res.cookie(name, value, options); 
        },
        remove(name: string, options: CookieOptions) {
          // Adapt cookie removal based on your API framework
          res.clearCookie(name, options);
        },
      },
    }
  );
}

// --- Service Role Client (Server-Side Only - Use with extreme caution) ---
// This client bypasses RLS and should only be used in trusted server environments.
// Ensure the service key is NEVER exposed to the client.
export function createServiceRoleClient() {
  // Validate server config when this function is called (or on module load if server-only)
  if (typeof window === 'undefined') {
    validateServerConfig(); // Ensure server vars are loaded
  }
  
  const SUPABASE_SERVICE_ROLE_KEY = serverConfig.supabase.serviceKey;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    // Validation should have caught this, but double-check
    console.error('SupABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Check config and .env files.');
    throw new Error('Supabase URL or Service Key is missing for Service Role Client.');
  }
  // Note: createServerClient is used here. Even though the service role key bypasses cookie auth,
  // the function signature requires the third argument (cookie options). We provide a minimal one.
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      // No-op cookie handlers as they are not used for service role
      get() { return undefined; },
      set() { /* Do nothing */ },
      remove() { /* Do nothing */ },
    },
  });
}
