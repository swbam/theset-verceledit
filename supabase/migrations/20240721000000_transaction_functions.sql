-- Functions for transaction support
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Using EXECUTE to start a transaction
  EXECUTE 'BEGIN';
END;
$$;

CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Using EXECUTE to commit a transaction
  EXECUTE 'COMMIT';
END;
$$;

CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Using EXECUTE to rollback a transaction
  EXECUTE 'ROLLBACK';
END;
$$;

-- Create cache tables
CREATE TABLE IF NOT EXISTS api_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(endpoint)
);

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  error TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_api_cache_endpoint ON api_cache(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC); 