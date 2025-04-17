import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client for authenticated user operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for background jobs and privileged operations
export const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// Re-export createClient for flexibility
export { createClient };
