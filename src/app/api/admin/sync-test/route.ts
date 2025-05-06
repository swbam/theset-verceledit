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
      body: { artistName, mode: 'full' }
    });

    if (syncError) {
      console.error('Sync error:', syncError);
      return NextResponse.json({ error: syncError.message }, { status: 500 });
    }

    // Get counts from database for detailed response
    const { data: artist } = await supabase
      .from('artists')
      .select('id')
      .eq('name', artistName)
      .single();

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found after sync' }, { status: 500 });
    }

    const { count: songsCount } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artist.id);

    const { count: showsCount } = await supabase
      .from('shows')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artist.id);

    const { count: setlistsCount } = await supabase
      .from('setlists')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artist.id);

    return NextResponse.json({
      artistId: artist.id,
      songsCount: songsCount || 0,
      showsCount: showsCount || 0,
      setlistsCount: setlistsCount || 0,
      syncDetails: syncData
    });

  } catch (error) {
    console.error('Admin sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 