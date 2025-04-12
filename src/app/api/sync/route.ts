import { NextRequest, NextResponse } from 'next/server';
// Removed duplicate import
import { SyncManager } from '@/lib/sync/manager'; // Import the SyncManager
import { EntityType, SyncOperation } from '@/lib/sync/types'; // Import necessary types
// Import the correct server-side client creation utilities
import { createServerActionClient } from '@/integrations/supabase/utils'; 

// Instantiate the SyncManager
// Note: Depending on how stateful the manager/queue is,
// you might need a singleton pattern or manage its lifecycle differently.
// For a serverless environment, instantiating per request might be okay
// if the queue relies on the database for persistence.
const syncManager = new SyncManager();

// CORS headers for responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Custom error class for API route
class SyncAPIError extends Error {
  status: number;
  context?: Record<string, any>;
  
  constructor(message: string, status: number = 500, context?: Record<string, any>) {
    super(message);
    this.name = 'SyncAPIError';
    this.status = status;
    this.context = context;
  }
}

// Log function with environment-aware behavior
function logError(error: any, context?: Record<string, any>) {
  const errorObj = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
  };
  
  // In production we'd want to send this to a logging service
  // For now, we'll just console.error it with proper formatting
  console.error('SYNC API ERROR:', JSON.stringify(errorObj, null, 2));
}
// Remove the invokeSyncFunction helper as we'll use the SyncManager queue

/**
 * API route for initiating entity sync operations
 */
export async function POST(request: NextRequest): Promise<NextResponse> { // Add return type
  let requestBody;
  
  try {
    // Check if user is authenticated using the server action client
    const supabaseServerClient = createServerActionClient(); // Use the correct utility
    const { data: { user }, error: authError } = await supabaseServerClient.auth.getUser();
    
    if (authError) {
      throw new SyncAPIError(`Authentication error: ${authError.message}`, 401, { code: 'auth_error' });
    }
    
    if (!user) {
      throw new SyncAPIError('Authentication required', 401, { code: 'auth_required' });
    }
    
    // Parse the request body
    try {
      requestBody = await request.json();
    } catch (e) {
      throw new SyncAPIError('Invalid JSON in request body', 400, { code: 'invalid_json' });
    }
    
    // Validate required fields
    if (!requestBody.type || !requestBody.operation) {
      throw new SyncAPIError('Missing required fields: type, operation', 400, { 
        code: 'missing_fields',
        fields: ['type', 'operation']
      });
    }
    
    // Validate entity type
    if (!['artist', 'venue', 'show', 'setlist', 'song'].includes(requestBody.type)) {
      throw new SyncAPIError('Invalid entity type', 400, { 
        code: 'invalid_entity_type',
        providedType: requestBody.type,
        validTypes: ['artist', 'venue', 'show', 'setlist', 'song']
      });
    }
    
    // Validate operation
    if (!['create', 'refresh', 'expand_relations', 'cascade_sync'].includes(requestBody.operation)) {
      throw new SyncAPIError('Invalid operation', 400, { 
        code: 'invalid_operation',
        providedOperation: requestBody.operation,
        validOperations: ['create', 'refresh', 'expand_relations', 'cascade_sync']
      });
    }
    
    // For certain operations, entityId is required
    if (['create', 'refresh', 'expand_relations'].includes(requestBody.operation) && !requestBody.id) {
      throw new SyncAPIError('Entity ID is required for this operation', 400, { 
        code: 'missing_entity_id',
        operation: requestBody.operation
      });
    }
    
    // Use the SyncManager to handle operations
    let result: any = { success: false };
    const entityId = requestBody.id; // May be undefined for some operations
    const entityType = requestBody.type as EntityType;
    const operation = requestBody.operation as SyncOperation; // Assuming SyncOperation type exists

    try {
      // Add the task to the SyncManager's queue
      // The queue will handle processing based on priority, retries, etc.
      // The API returns immediately, acknowledging the task has been queued.
      
      // Determine priority based on operation
      let priority: 'high' | 'medium' | 'low' = 'medium';
      if (operation === 'create' || operation === 'refresh') {
        priority = 'high'; // User-initiated actions often need higher priority
      } else if (operation === 'expand_relations' || operation === 'cascade_sync') {
        priority = 'medium';
      }

      // Validate ID presence for operations that require it
      if (['create', 'refresh', 'expand_relations', 'cascade_sync'].includes(operation) && !entityId) {
         throw new SyncAPIError(`Entity ID is required for operation: ${operation}`, 400);
      }

      // Add task to the queue
      // Note: The SyncQueue implementation in sync-system-missing-files.md
      // expects the SyncManager instance in its constructor.
      // Ensure the SyncManager passed to the queue is the same instance used here.
      // The current instantiation `const syncManager = new SyncManager();` might need adjustment
      // if the queue needs to persist state across requests (e.g., using a singleton).
      // However, the provided queue code loads/persists from DB, so per-request might be okay.

      // Use the public enqueueTask method
      await syncManager.enqueueTask({
        type: entityType,
        id: entityId, // Pass ID even for cascade, manager methods expect it
        priority: priority,
        operation: operation,
        // payload: requestBody.payload // Optional: Pass extra data if needed
      });

      // Trigger queue processing (optional, queue might have interval timer)
      // syncManager.queue.processQueue(); // Consider if needed or rely on interval

      result = {
        success: true,
        message: `Sync task [${operation} ${entityType} ${entityId || ''}] queued with priority ${priority}.`,
        queueStatus: syncManager.getQueueStatus() // Provide current queue status
      };

    } catch (error) {
      // Specialized error handling for sync operations
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(error, { 
        operation: requestBody.operation, 
        entityType: requestBody.type, 
        entityId: requestBody.id 
      });
      
      throw new SyncAPIError(`Sync operation failed: ${errorMessage}`, 500, {
        code: 'sync_operation_failed',
        operationDetails: {
          operation: requestBody.operation,
          entityType: requestBody.type,
          entityId: requestBody.id
        }
      });
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      result: result, // Return the queue acknowledgement message and status
    }, { 
      status: 200,
      headers: corsHeaders
    });
    
  } catch (error) {
    // Handle all errors in one place
    if (error instanceof SyncAPIError) {
      // Already formatted error
      logError(error, error.context);
      return NextResponse.json({
        error: error.message,
        code: error.context?.code || 'unknown_error',
        details: error.context
      }, { 
        status: error.status,
        headers: corsHeaders
      });
    } else {
      // Unexpected error
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(error, { requestBody });
      return NextResponse.json({
        error: 'Internal server error',
        code: 'internal_error',
        message: errorMessage
      }, { 
        status: 500,
        headers: corsHeaders
      });
    }
  }
}

/**
 * API route for checking sync status
 */
export async function GET(request: NextRequest) { // Add return type Promise<NextResponse>
  try {
    // Check if user is authenticated using the server action client
    const supabaseServerClient = createServerActionClient(); // Use the correct utility
    const { data: { user }, error: authError } = await supabaseServerClient.auth.getUser();
    
    if (authError) {
      throw new SyncAPIError(`Authentication error: ${authError.message}`, 401, { code: 'auth_error' });
    }
    
    if (!user) {
      throw new SyncAPIError('Authentication required', 401, { code: 'auth_required' });
    }
    
    // Get queue status using the SyncManager instance
    const queueStatus = syncManager.getQueueStatus();
    
    return NextResponse.json({
      success: true,
      queueStatus: queueStatus // Return the actual queue status
    }, { 
      status: 200,
      headers: corsHeaders 
    });
    
  } catch (error) {
    // Handle all errors
    if (error instanceof SyncAPIError) {
      // Already formatted error
      logError(error, error.context);
      return NextResponse.json({
        error: error.message,
        code: error.context?.code || 'unknown_error',
        details: error.context
      }, { 
        status: error.status,
        headers: corsHeaders
      });
    } else {
      // Unexpected error
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(error);
      return NextResponse.json({
        error: 'Internal server error',
        code: 'internal_error',
        message: errorMessage
      }, { 
        status: 500,
        headers: corsHeaders
      });
    }
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}
