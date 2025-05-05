-- Apply RLS cleanup and consolidation

BEGIN;

-- ========= artists =========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'artists'
  ) THEN
    -- Drop existing potentially conflicting/redundant policies
    DROP POLICY IF EXISTS "Allow SELECT for authenticated" ON public.artists;
    DROP POLICY IF EXISTS "Allow authenticated users to create artists" ON public.artists;
DROP POLICY IF EXISTS "Allow authenticated users to update artists" ON public.artists;
DROP POLICY IF EXISTS "Allow public read access" ON public.artists;
DROP POLICY IF EXISTS "Allow public read access to artists" ON public.artists;
DROP POLICY IF EXISTS "Allow service role full access" ON public.artists; -- Will be recreated
DROP POLICY IF EXISTS "Enable read access for all users" ON public.artists; -- Will be recreated
DROP POLICY IF EXISTS "Public artists are viewable by everyone" ON public.artists;
DROP POLICY IF EXISTS "Service role and anon can do all on artists" ON public.artists;
DROP POLICY IF EXISTS "All users can read artists" ON public.artists; -- Will be recreated
DROP POLICY IF EXISTS "Enable write access for service role" ON public.artists;

-- Create consolidated policies
-- 1. Enable read access for everyone (public)
CREATE POLICY "Enable read access for all users" ON public.artists FOR SELECT USING (true);

-- 2. Allow ALL operations for service_role
CREATE POLICY "Allow service_role full access" ON public.artists FOR ALL
  USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ========= shows =========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shows'
  ) THEN
    -- Drop existing potentially conflicting/redundant policies
    DROP POLICY IF EXISTS "Allow SELECT for authenticated" ON public.shows;
    DROP POLICY IF EXISTS "Allow authenticated users to create shows" ON public.shows;
DROP POLICY IF EXISTS "Allow authenticated users to update shows" ON public.shows;
DROP POLICY IF EXISTS "Allow public read access" ON public.shows;
DROP POLICY IF EXISTS "Allow public read access to shows" ON public.shows;
DROP POLICY IF EXISTS "Allow service role full access" ON public.shows; -- Will be recreated
DROP POLICY IF EXISTS "Public shows are viewable by everyone" ON public.shows;
DROP POLICY IF EXISTS "Service role and anon can do all on shows" ON public.shows;
DROP POLICY IF EXISTS "All users can read shows" ON public.shows; -- Will be recreated
DROP POLICY IF EXISTS "enable_read_access_for_all" ON public.shows; -- Will be recreated

-- Create consolidated policies
-- 1. Enable read access for everyone (public)
CREATE POLICY "Enable read access for all users" ON public.shows FOR SELECT USING (true);

-- 2. Allow ALL operations for service_role
CREATE POLICY "Allow service_role full access" ON public.shows FOR ALL
  USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ========= setlists =========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'setlists'
  ) THEN
    -- Drop existing potentially conflicting/redundant policies
    DROP POLICY IF EXISTS "Allow public read access" ON public.setlists;
    DROP POLICY IF EXISTS "Allow service role full access" ON public.setlists; -- Will be recreated
DROP POLICY IF EXISTS "Public setlists are viewable by everyone" ON public.setlists;
DROP POLICY IF EXISTS "Service role and anon can do all on setlists" ON public.setlists;
DROP POLICY IF EXISTS "Setlists are deletable by authenticated users" ON public.setlists;
DROP POLICY IF EXISTS "Setlists are insertable by authenticated users" ON public.setlists;
DROP POLICY IF EXISTS "Setlists are updatable by authenticated users" ON public.setlists;
DROP POLICY IF EXISTS "Setlists are viewable by everyone" ON public.setlists; -- Will be recreated
DROP POLICY IF EXISTS "modify_authenticated" ON public.setlists;
DROP POLICY IF EXISTS "select_authenticated" ON public.setlists;
DROP POLICY IF EXISTS "All users can read setlists" ON public.setlists; -- Will be recreated

-- Create consolidated policies
-- 1. Enable read access for everyone (public)
CREATE POLICY "Enable read access for all users" ON public.setlists FOR SELECT USING (true);

-- 2. Allow ALL operations for service_role
CREATE POLICY "Allow service_role full access" ON public.setlists FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Allow authenticated users to manage their setlists (adjust if needed, e.g., based on ownership)
-- Example: Allow insert/update/delete if a user_id column exists
-- CREATE POLICY "Allow authenticated users to manage own setlists" ON public.setlists
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    -- For now, only allowing service role write access based on previous policies.
  END IF;
END $$;

-- ========= votes =========
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'votes'
  ) THEN
    -- Drop existing potentially conflicting/redundant policies
    DROP POLICY IF EXISTS "Allow service role access to votes" ON public.votes; -- Will be recreated
    DROP POLICY IF EXISTS "Allow users to read own votes" ON public.votes; -- Will be recreated
DROP POLICY IF EXISTS "Authenticated users can vote" ON public.votes;
DROP POLICY IF EXISTS "Service role and anon can do all on votes" ON public.votes;
DROP POLICY IF EXISTS "Users can create their own votes" ON public.votes; -- Will be recreated
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.votes; -- Will be recreated
DROP POLICY IF EXISTS "Users can modify their own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.votes; -- Will be recreated
DROP POLICY IF EXISTS "Users can view all votes" ON public.votes; -- Will be recreated
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.votes; -- Will be recreated
DROP POLICY IF EXISTS "Allow authenticated users to vote" ON public.votes; -- Will be recreated

-- Create consolidated policies
-- 1. Allow users to view all votes (public read access)
CREATE POLICY "Enable read access for all users" ON public.votes FOR SELECT USING (true);

-- 2. Allow authenticated users to manage their own votes (insert, select, update, delete)
CREATE POLICY "Allow users to manage their own votes" ON public.votes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow service_role full access
CREATE POLICY "Allow service_role full access" ON public.votes FOR ALL
  USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

COMMIT;