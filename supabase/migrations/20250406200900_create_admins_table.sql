-- Create admins table to store user IDs with admin privileges
CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS) for the admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Policies for admins table:
-- 1. Admins should NOT be able to see other admins by default (optional, good practice)
--    (No SELECT policy needed if only server-side checks are done)
-- 2. Allow server-side access (using service_role key) to bypass RLS for checks.
--    (No specific policy needed if checks use service_role)

-- Optional: Allow authenticated users to check if THEY are an admin (if needed client-side)
-- CREATE POLICY "Allow users to check their own admin status"
-- ON public.admins FOR SELECT
-- TO authenticated
-- USING (auth.uid() = user_id);

COMMENT ON TABLE public.admins IS 'Stores user IDs that have administrator privileges.';