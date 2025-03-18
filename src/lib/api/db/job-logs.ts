import { supabase } from "@/integrations/supabase/client";

/**
 * Log types for the job logs
 */
export type JobLogType = 
  | 'setlist_batch' 
  | 'homepage_init'
  | 'artist_sync'
  | 'maintenance_run';

/**
 * Interface for job log data
 */
export interface JobLogData {
  job_type: JobLogType;
  items_processed: number;
  items_created: number;
  errors: string[];
  status: 'success' | 'partial' | 'failure';
  metadata?: Record<string, any>;
}

/**
 * Create a job log entry in the database
 */
export async function logJobRun(data: JobLogData): Promise<string | null> {
  try {
    // Check if job_logs table exists, create it if it doesn't
    await ensureJobLogsTable();
    
    const { data: logEntry, error } = await supabase
      .from('job_logs')
      .insert({
        job_type: data.job_type,
        items_processed: data.items_processed,
        items_created: data.items_created,
        error_count: data.errors.length,
        errors: data.errors,
        status: data.status,
        metadata: data.metadata || {},
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (error) {
      console.error("Error logging job run:", error);
      return null;
    }
    
    return logEntry.id;
  } catch (error) {
    console.error("Error in logJobRun:", error);
    return null;
  }
}

/**
 * Get recent job runs of a specific type
 */
export async function getRecentJobLogs(
  jobType: JobLogType,
  limit: number = 10
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('job_logs')
      .select('*')
      .eq('job_type', jobType)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error("Error fetching job logs:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getRecentJobLogs:", error);
    return [];
  }
}

/**
 * Get the last successful run time for a job type
 */
export async function getLastSuccessfulRun(jobType: JobLogType): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('job_logs')
      .select('created_at')
      .eq('job_type', jobType)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error || !data) {
      console.error("Error fetching last successful run:", error);
      return null;
    }
    
    return new Date(data.created_at);
  } catch (error) {
    console.error("Error in getLastSuccessfulRun:", error);
    return null;
  }
}

/**
 * Ensure the job_logs table exists in the database
 */
async function ensureJobLogsTable(): Promise<void> {
  try {
    // Check if the table exists by trying to get a single row
    const { error } = await supabase
      .from('job_logs')
      .select('id')
      .limit(1);
      
    // If there's an error and it indicates the table doesn't exist, create it
    if (error && error.code === '42P01') {
      console.log("job_logs table doesn't exist, creating it");
      await createJobLogsTable();
    }
  } catch (error) {
    console.error("Error in ensureJobLogsTable:", error);
  }
}

/**
 * Create the job_logs table in the database
 * Note: This is a fallback that would rarely be used since
 * we should create tables through proper migrations
 */
async function createJobLogsTable(): Promise<void> {
  try {
    const { error } = await supabase.rpc('create_job_logs_table');
    
    if (error) {
      console.error("Error creating job_logs table:", error);
    }
  } catch (error) {
    console.error("Error in createJobLogsTable:", error);
  }
} 