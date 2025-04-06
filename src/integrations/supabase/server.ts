import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase configuration for server-side usage
const SUPABASE_URL = process.env.SUPABASE_URL || "https://kzjnkqeosrycfpxjwhil.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 
                         "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6am5rcWVvc3J5Y2ZweGp3aGlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2ODM3ODMsImV4cCI6MjA1ODI1OTc4M30.KOriVTUxlnfiBpWmVrlO4xHM7nniizLgXQ49f2K22UM";

// Log the Supabase configuration for debugging in dev mode
if (process.env.NODE_ENV !== 'production') {
  console.log('[Server] Supabase URL:', SUPABASE_URL);
  console.log('[Server] Supabase Key available:', SUPABASE_SERVICE_KEY ? 'Yes' : 'No');
}

/**
 * Creates a Supabase client for server-side usage
 * This is used by API routes to access Supabase
 */
export function createClient() {
  return createSupabaseClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY
  );
}

/**
 * Creates a Supabase admin client for elevated permissions
 * This should only be used for admin operations, where RLS needs to be bypassed
 */
export function createAdminClient() {
  // Same as createClient for now since we're using the same key
  // but semantically separated for future where we might use different permissions
  return createSupabaseClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  );
} 