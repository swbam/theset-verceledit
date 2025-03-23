-- Create a function to execute arbitrary SQL
-- This is used by our migration scripts
CREATE OR REPLACE FUNCTION exec_sql_direct(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION exec_sql_direct(text) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql_direct(text) TO service_role;