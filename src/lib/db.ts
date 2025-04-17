import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Public client for authenticated user operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for background jobs and privileged operations
export const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// Re-export createClient for flexibility
export { createClient };
