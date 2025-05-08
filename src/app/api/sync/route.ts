import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkCategoryEnvironmentVariables, getRequiredEnv } from '@/lib/utils/checkEnv';

export const dynamic = 'force-dynamic'; // No caching for this route

interface SyncRequest {
  entityType: 'artist' | 'show' | 'venue';
  entityId?: string;
  ticketmasterId?: string;
  spotifyId?: string;
  options?: {
    skipDependencies?: boolean;
    forceRefresh?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    checkCategoryEnvironmentVariables('supabase');
    
    // Create authenticated Supabase client
    const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseServiceRole = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Parse request body
    const body = await request.json();
    const { entityType, entityId, ticketmasterId, spotifyId, options } = body as SyncRequest;
    
    if (!entityType || !['artist', 'show', 'venue'].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entityType. Must be "artist", "show", or "venue"' },
        { status: 400 }
      );
    }
    
    // Validate required parameters based on entity type
    if (entityType === 'artist' && !ticketmasterId) {
      return NextResponse.json(
        { error: 'ticketmasterId is required for artist sync' },
        { status: 400 }
      );
    }
    
    if ((entityType === 'show' || entityType === 'venue') && !entityId) {
      return NextResponse.json(
        { error: `entityId is required for ${entityType} sync` },
        { status: 400 }
      );
    }
    
    console.log(`[sync-api] Initiating ${entityType} sync:`, 
      entityType === 'artist' ? `ticketmasterId=${ticketmasterId}` :
      `entityId=${entityId}`);
    
    // Invoke Edge Function
    const { data, error } = await supabase.functions.invoke('unified-sync-v2', {
      body: { entityType, entityId, ticketmasterId, spotifyId, options },
    });
    
    if (error) {
      console.error(`[sync-api] Edge Function error:`, error);
      return NextResponse.json(
        { error: error.message || 'Error invoking sync function' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[sync-api] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '2',
    message: 'Use POST request to trigger sync operations'
  });
}
