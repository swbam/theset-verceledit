-- Drop any foreign key constraints first
DO $$ 
BEGIN
  -- Drop constraints referencing sync_queue
  EXECUTE (
    SELECT string_agg(
      format(
        'ALTER TABLE %I.%I DROP CONSTRAINT %I;',
        nsp.nspname,
        cls.relname,
        con.conname
      ),
      E'\n'
    )
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE con.confrelid = (
      SELECT oid FROM pg_class WHERE relname = 'sync_queue' AND relnamespace = (
        SELECT oid FROM pg_namespace WHERE nspname = 'public'
      )
    )
  );

  -- Drop constraints referencing sync_operations
  EXECUTE (
    SELECT string_agg(
      format(
        'ALTER TABLE %I.%I DROP CONSTRAINT %I;',
        nsp.nspname,
        cls.relname,
        con.conname
      ),
      E'\n'
    )
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE con.confrelid = (
      SELECT oid FROM pg_class WHERE relname = 'sync_operations' AND relnamespace = (
        SELECT oid FROM pg_namespace WHERE nspname = 'public'
      )
    )
  );
END $$;

-- Drop old sync system tables that are no longer needed
DROP TABLE IF EXISTS public.sync_queue;
DROP TABLE IF EXISTS public.sync_operations;

-- Keep sync_states table as it's still used by Edge Functions
-- but update its comment to reflect the new system
COMMENT ON TABLE public.sync_states IS 'Tracks sync state of entities across Edge Functions';