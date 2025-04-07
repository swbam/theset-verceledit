-- Explicitly grant permissions to service_role for the artists table
-- This should normally be covered by the role's default privileges,
-- but we add it explicitly to override any potential unexpected restrictions.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.artists TO service_role;

-- Also grant for shows table, as it might be affected similarly
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shows TO service_role;

-- Grant usage on sequences if your primary keys rely on them (UUIDs usually don't)
-- Example: GRANT USAGE, SELECT ON SEQUENCE public.artists_id_seq TO service_role; 
-- (Adjust sequence name if needed, likely not necessary for UUID PKs)