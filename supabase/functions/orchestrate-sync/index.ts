/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface SyncTask {
  id?: string;
  entity_type: 'artist' | 'venue' | 'show' | 'setlist' | 'song';
  entity_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  error?: string;
  result?: any;
  dependencies?: string[];
  priority?: number;
}

interface OrchestrateSyncPayload {
  operation: 'start' | 'process' | 'status' | 'retry_failed';
  entityType?: 'artist' | 'venue' | 'show' | 'setlist' | 'song';
  entityId?: string;
  limit?: number;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request payload
    const { operation, entityType, entityId, limit = 5 } = await req.json() as OrchestrateSyncPayload;

    switch (operation) {
      case 'start':
        return await startSync(supabase, entityType, entityId);

      case 'process':
        return await processPendingTasks(supabase, limit);

      case 'status':
        return await getSyncStatus(supabase, entityType, entityId);

      case 'retry_failed':
        return await retryFailedTasks(supabase);

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    console.error('Orchestration error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function startSync(
  supabase: any,
  entityType?: 'artist' | 'venue' | 'show' | 'setlist' | 'song',
  entityId?: string
): Promise<Response> {
  if (!entityType || !entityId) {
    throw new Error('Entity type and ID are required');
  }

  console.log(`Starting sync for ${entityType} ${entityId}`);

  // Create a new sync task
  const task: SyncTask = {
    entity_type: entityType,
    entity_id: entityId,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    priority: getPriorityForEntityType(entityType)
  };

  // Insert the task into the sync_tasks table
  const { data, error } = await supabase
    .from('sync_tasks')
    .upsert(task, { onConflict: 'entity_type,entity_id', ignoreDuplicates: false })
    .select();

  if (error) {
    throw new Error(`Failed to create sync task: ${error.message}`);
  }

  // Immediately process this task
  await processTask(supabase, data[0]);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Sync started for ${entityType} ${entityId}`,
      data
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processPendingTasks(supabase: any, limit: number): Promise<Response> {
  console.log(`Processing up to ${limit} pending tasks`);

  // Get pending tasks, ordered by priority (higher numbers first) and creation time
  const { data: tasks, error } = await supabase
    .from('sync_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch pending tasks: ${error.message}`);
  }

  if (!tasks || tasks.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'No pending tasks found',
        data: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Found ${tasks.length} pending tasks`);
  
  // Process each task in sequence
  const results = [];
  for (const task of tasks) {
    try {
      const result = await processTask(supabase, task);
      results.push(result);
    } catch (error) {
      console.error(`Error processing task ${task.id}:`, error);
      results.push({
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `Processed ${results.length} tasks`,
      data: results
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getSyncStatus(
  supabase: any,
  entityType?: 'artist' | 'venue' | 'show' | 'setlist' | 'song',
  entityId?: string
): Promise<Response> {
  let query = supabase.from('sync_tasks').select('*');

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  if (entityId) {
    query = query.eq('entity_id', entityId);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get sync status: ${error.message}`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      data
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function retryFailedTasks(supabase: any): Promise<Response> {
  // Get all failed tasks
  const { data: failedTasks, error } = await supabase
    .from('sync_tasks')
    .select('*')
    .eq('status', 'failed')
    .order('updated_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch failed tasks: ${error.message}`);
  }

  if (!failedTasks || failedTasks.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'No failed tasks found',
        data: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Found ${failedTasks.length} failed tasks to retry`);

  // Reset tasks to pending state
  const { data: updatedTasks, error: updateError } = await supabase
    .from('sync_tasks')
    .update({
      status: 'pending',
      updated_at: new Date().toISOString(),
      error: null
    })
    .eq('status', 'failed')
    .select();

  if (updateError) {
    throw new Error(`Failed to reset failed tasks: ${updateError.message}`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: `Reset ${updatedTasks.length} failed tasks to pending`,
      data: updatedTasks
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processTask(supabase: any, task: SyncTask): Promise<any> {
  console.log(`Processing task: ${task.entity_type} ${task.entity_id}`);

  // Update task status to in_progress
  const { error: updateError } = await supabase
    .from('sync_tasks')
    .update({
      status: 'in_progress',
      updated_at: new Date().toISOString()
    })
    .eq('id', task.id);

  if (updateError) {
    console.error(`Failed to update task status: ${updateError.message}`);
  }

  try {
    // Call the appropriate sync function based on entity type
    const syncFunction = getSyncFunctionForEntityType(task.entity_type);
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${syncFunction}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ 
        [getIdParamNameForEntityType(task.entity_type)]: task.entity_id 
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Sync function returned error (${response.status}): ${errorData}`);
    }

    const result = await response.json();

    // Update task as completed
    const { error } = await supabase
      .from('sync_tasks')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        result
      })
      .eq('id', task.id);

    if (error) {
      console.error(`Failed to update task as completed: ${error.message}`);
    }

    // Check for dependent entities to sync
    await queueDependentEntities(supabase, task, result);

    return {
      taskId: task.id,
      success: true,
      result
    };
  } catch (error) {
    console.error(`Error processing task ${task.id}:`, error);

    // Update task as failed
    const errorMessage = error instanceof Error ? error.message : String(error);
    const { error: updateError } = await supabase
      .from('sync_tasks')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
        error: errorMessage
      })
      .eq('id', task.id);

    if (updateError) {
      console.error(`Failed to update task as failed: ${updateError.message}`);
    }

    return {
      taskId: task.id,
      success: false,
      error: errorMessage
    };
  }
}

async function queueDependentEntities(supabase: any, task: SyncTask, result: any): Promise<void> {
  // Define dependencies based on entity type
  const dependentEntities: SyncTask[] = [];

  switch (task.entity_type) {
    case 'artist':
      // Artist -> Shows
      if (result?.data?.shows) {
        for (const show of result.data.shows) {
          dependentEntities.push({
            entity_type: 'show',
            entity_id: show.id,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            priority: getPriorityForEntityType('show'),
            dependencies: [task.id]
          });
        }
      }
      break;

    case 'venue':
      // Venue -> Shows
      if (result?.data?.shows) {
        for (const show of result.data.shows) {
          dependentEntities.push({
            entity_type: 'show',
            entity_id: show.id,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            priority: getPriorityForEntityType('show'),
            dependencies: [task.id]
          });
        }
      }
      break;

    case 'show':
      // Show -> Setlists
      if (result?.data?.setlists) {
        for (const setlist of result.data.setlists) {
          dependentEntities.push({
            entity_type: 'setlist',
            entity_id: setlist.id,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            priority: getPriorityForEntityType('setlist'),
            dependencies: [task.id]
          });
        }
      }
      break;

    case 'setlist':
      // Setlist -> Songs
      if (result?.data?.songs) {
        for (const song of result.data.songs) {
          dependentEntities.push({
            entity_type: 'song',
            entity_id: song.id,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            priority: getPriorityForEntityType('song'),
            dependencies: [task.id]
          });
        }
      }
      break;
  }

  // Insert dependent entities into sync_tasks table
  if (dependentEntities.length > 0) {
    console.log(`Queueing ${dependentEntities.length} dependent entities`);
    
    const { error } = await supabase
      .from('sync_tasks')
      .upsert(dependentEntities, { onConflict: 'entity_type,entity_id', ignoreDuplicates: false });

    if (error) {
      console.error(`Failed to queue dependent entities: ${error.message}`);
    }
  }
}

function getSyncFunctionForEntityType(entityType: string): string {
  switch (entityType) {
    case 'artist': return 'sync-artist';
    case 'venue': return 'sync-venue';
    case 'show': return 'sync-show';
    case 'setlist': return 'sync-setlist';
    case 'song': return 'sync-song';
    default: return 'sync-default';
  }
}

function getIdParamNameForEntityType(entityType: string): string {
  switch (entityType) {
    case 'artist': return 'artistId';
    case 'venue': return 'venueId';
    case 'show': return 'showId';
    case 'setlist': return 'setlistId';
    case 'song': return 'songId';
    default: return 'id';
  }
}

function getPriorityForEntityType(entityType: string): number {
  switch (entityType) {
    case 'artist': return 100;
    case 'venue': return 90;
    case 'show': return 80;
    case 'setlist': return 70;
    case 'song': return 60;
    default: return 0;
  }
}
