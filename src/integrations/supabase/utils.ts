import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers'; // Assuming Next.js API routes use this

// --- Environment Variables ---
// Ensure these are correctly defined in your .env files
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     (typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : undefined) ||
                     "https://kzjnkqeosrycfpxjwhil.supabase.co";

const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                          (typeof import.meta !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined) ||
                          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2ODM3ODMsImV4cCI6MjA1ODI1OTc4M30.KOriVTUxlnfiBpWmVrlO4xHM7nniizLgXQ49f2K22UM";

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

// --- Server-Side Client (for Next.js API Routes) ---
// This assumes usage within Next.js API routes where `cookies` from `next/headers` is available.
// If used elsewhere (e.g., server components), adjust cookie handling accordingly.
export function createServerActionClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase URL or Anon Key is missing. Check environment variables.');
    throw new Error('Supabase URL or Anon Key is missing.');
  }
  const cookieStore = cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
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
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase URL or Service Key is missing for Service Role Client.');
    throw new Error('Supabase URL or Service Key is missing.');
  }
  // Note: createServerClient is used here. Even though the service role key bypasses cookie auth,
  // the function signature requires the third argument (cookie options). We provide a minimal one.
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    cookies: {
      // No-op cookie handlers as they are not used for service role
      get() { return undefined; },
      set() { /* Do nothing */ },
      remove() { /* Do nothing */ },
    },
  });
}
