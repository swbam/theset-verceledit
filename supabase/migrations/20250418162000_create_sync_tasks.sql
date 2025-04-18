-- Create sync_tasks table for managing background sync operations

-- First check if table doesn't exist
CREATE TABLE IF NOT EXISTS public.sync_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- e.g., 'artist', 'show', 'venue', 'song'
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 1, -- Higher numbers = higher priority
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  dependencies TEXT[] DEFAULT ARRAY[]::TEXT[], -- IDs of tasks that must complete before this one
  error TEXT, -- Error message if failed
  entity_name TEXT, -- Friendly name for display
  result JSONB DEFAULT '{}'::JSONB, -- Results or metadata
  data JSONB DEFAULT '{}'::JSONB -- Additional data for the sync process
);

-- Add indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_sync_tasks_entity_type ON public.sync_tasks(entity_type);
CREATE INDEX IF NOT EXISTS idx_sync_tasks_entity_id ON public.sync_tasks(entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_tasks_status ON public.sync_tasks(status);
CREATE INDEX IF NOT EXISTS idx_sync_tasks_priority ON public.sync_tasks(priority DESC);
CREATE INDEX IF NOT EXISTS idx_sync_tasks_created_at ON public.sync_tasks(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sync_tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all tasks
CREATE POLICY "Admins can view all sync tasks" 
  ON public.sync_tasks 
  FOR SELECT 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- Create policy for admins to create sync tasks
CREATE POLICY "Admins can create sync tasks" 
  ON public.sync_tasks 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
  
-- Create policy for admins to update sync tasks
CREATE POLICY "Admins can update sync tasks" 
  ON public.sync_tasks 
  FOR UPDATE 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- Create a get_sync_tasks function to retrieve tasks with pagination
CREATE OR REPLACE FUNCTION public.get_sync_tasks(
  p_status TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
) 
RETURNS SETOF public.sync_tasks 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.sync_tasks
  WHERE 
    (p_status IS NULL OR status = p_status) AND
    (p_entity_type IS NULL OR entity_type = p_entity_type)
  ORDER BY
    priority DESC,
    created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
