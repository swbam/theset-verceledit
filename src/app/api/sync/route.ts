import { supabase } from "@/integrations/supabase/client";
import { EntityType } from '@/lib/sync-types';
import { ErrorSource, handleError } from '@/lib/error-handling';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Initialize unified sync process
    const result = await supabase.functions.invoke('unified-sync-v2', {
      body: {}
    });

    if (!result.data?.success) {
      handleError({
        message: 'Error during unified sync process',
        source: ErrorSource.API,
        originalError: result.error
      });
      return NextResponse.json({ error: result.error?.message || 'Sync failed' }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    handleError({
      message: 'Unexpected error during unified sync',
      source: ErrorSource.API,
      originalError: error
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entityType, entityId, options } = body;

    // Add validation
    if (!Object.values(EntityType).includes(entityType)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid entityType: ${entityType}`
      }), { status: 400 });
    }

    if (!entityType || !entityId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: entityType, entityId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Call the unified sync orchestrator
    const result = await supabase.functions.invoke('orchestrate-sync', {
      body: { 
        entityType,
        entityId,
        options: options || {}
      }
    });

    if (!result.data?.success) {
      throw new Error(result.error?.message || `Failed to sync ${entityType} ${entityId}`);
    }

    return new Response(JSON.stringify({
      success: true,
      data: result.data.data,
      message: `Successfully synced ${entityType} ${entityId}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
