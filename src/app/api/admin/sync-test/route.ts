import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { artistName } = await request.json();

    if (!artistName) {
      return NextResponse.json({ error: 'Artist name is required' }, { status: 400 });
    }

    // Call unified-sync-v2 Edge Function
    const { data: syncData, error: syncError } = await supabase.functions.invoke('unified-sync-v2', {
      body: { 
        entityType: 'artist',
        artistName,
        mode: 'full',
        options: {
          forceRefresh: true,
          skipDependencies: false
        }
      }
    });

    if (syncError) {
      console.error('Sync error:', syncError);
      return NextResponse.json({ 
        error: syncError.message,
        logs: syncData?.logs || []
      }, { status: 500 });
    }

    // Get counts from database for detailed response
    const { data: artist } = await supabase
      .from('artists')
      .select('id, name, spotify_id, ticketmaster_id, sync_status, last_sync, last_sync_error')
      .eq('name', artistName)
      .single();

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found after sync' }, { status: 500 });
    }

    // Get all related data counts
    const [songsResult, showsResult, setlistsResult] = await Promise.all([
      supabase
        .from('songs')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artist.id),
      supabase
        .from('shows')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artist.id),
      supabase
        .from('setlists')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artist.id)
    ]);

    return NextResponse.json({
      artist: {
        id: artist.id,
        name: artist.name,
        spotify_id: artist.spotify_id,
        ticketmaster_id: artist.ticketmaster_id,
        sync_status: artist.sync_status,
        last_sync: artist.last_sync,
        last_sync_error: artist.last_sync_error
      },
      counts: {
        songs: songsResult.count || 0,
        shows: showsResult.count || 0,
        setlists: setlistsResult.count || 0
      },
      logs: syncData?.logs || [],
      success: true
    });

  } catch (error: any) {
    console.error('Admin sync error:', error);
    return NextResponse.json({ 
      error: error.message,
      success: false,
      logs: []
    }, { status: 500 });
  }
} 