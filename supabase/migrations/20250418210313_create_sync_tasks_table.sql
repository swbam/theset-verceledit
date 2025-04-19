-- Create the sync_tasks table
CREATE TABLE IF NOT EXISTS public.sync_tasks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    priority integer DEFAULT 5,
    dependencies uuid[] DEFAULT '{}',
    entity_name text,
    data jsonb,
    error text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);

-- Add indexes for efficient querying
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_sync_tasks_status_priority ON public.sync_tasks (status, priority DESC);
  CREATE INDEX IF NOT EXISTS idx_sync_tasks_entity ON public.sync_tasks (entity_type, entity_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.sync_tasks ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage all sync tasks
CREATE POLICY "Supabase service role can manage sync tasks"
ON public.sync_tasks FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Note: Additional RLS policies might be needed based on specific application logic for authenticated/anon users.