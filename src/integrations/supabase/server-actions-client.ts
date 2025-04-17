import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// --- Environment Variables ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     "https://kzjnkqeosrycfpxjwhil.supabase.co";

const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2ODM3ODMsImV4cCI6MjA1ODI1OTc4M30.KOriVTUxlnfiBpWmVrlO4xHM7nniizLgXQ49f2K22UM";

// For server-side API routes (Pages Router and API Routes)
// Use this as a fallback for server-side operations in the pages/ directory
export function createServerActionClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase URL or Anon Key is missing for Server Action Client.');
    throw new Error('Supabase URL or Anon Key is missing.');
  }

  // Use the basic client for pages directory support
  // This won't have cookie support but will work for API routes
  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false
      }
    }
  );
}

// Note: For app directory Server Components and Route Handlers,
// you would typically use createServerClient from @supabase/ssr
// with cookies() from 'next/headers', but we're using a simpler
// approach here for compatibility with pages directory.
