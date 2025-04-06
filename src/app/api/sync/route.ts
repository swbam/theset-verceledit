import { NextRequest, NextResponse } from 'next/server';
import { SyncManager } from '@/lib/sync/manager';
import { EntityType } from '@/lib/sync/types';
import { createClient } from '@/integrations/supabase/server';

// Initialize sync manager
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

/**
 * API route for initiating entity sync operations
 */
export async function POST(request: NextRequest) {
  let requestBody;
  
  try {
    // Check if user is authenticated
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
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
    
    // Handle different operations
    let result: any;
    
    try {
      switch (requestBody.operation) {
        case 'create':
          result = await syncManager.createSingle(requestBody.type as EntityType, requestBody.id);
          break;
          
        case 'refresh':
          result = await syncManager.refreshSingle(requestBody.type as EntityType, requestBody.id);
          break;
          
        case 'expand_relations':
          result = await syncManager.expandRelations(requestBody.type as EntityType, requestBody.id);
          break;
          
        case 'cascade_sync':
          if (requestBody.type === 'artist') {
            result = await syncManager.artistCascadeSync(requestBody.id);
          } else if (requestBody.type === 'venue') {
            result = await syncManager.venueCascadeSync(requestBody.id);
          } else {
            throw new SyncAPIError('Cascade sync only supported for artist and venue', 400, { 
              code: 'operation_not_supported',
              entityType: requestBody.type,
              operation: 'cascade_sync'
            });
          }
          break;
      }
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
      result,
      queueStatus: syncManager.getQueueStatus()
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
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      throw new SyncAPIError(`Authentication error: ${authError.message}`, 401, { code: 'auth_error' });
    }
    
    if (!user) {
      throw new SyncAPIError('Authentication required', 401, { code: 'auth_required' });
    }
    
    // Get queue status
    const queueStatus = syncManager.getQueueStatus();
    
    return NextResponse.json({
      success: true,
      queueStatus
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