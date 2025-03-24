import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchSetlistFmData, processSetlistData } from '../../sync/setlist';
import { retryableFetch } from '@/lib/retry';

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { artistId: string } }
) {
  const { artistId } = params;
  
  try {
    // Check if we have this artist in the database
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('id, name, setlist_fm_mbid')
      .eq('id', artistId)
      .single();
      
    if (artistError) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }
    
    // Get shows and setlists from DB first
    const { data: existingData } = await supabase
      .from('shows')
      .select(`
        id, 
        date, 
        venue, 
        city,
        setlists:setlists!inner(
          id, 
          songs:songs(id, title, vote_count)
        )
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: false })
      .limit(50);
      
    // Check if we have enough data already
    const hasExistingData = existingData && existingData.length > 0;
    
    // If we don't have data or just one show, fetch from Setlist.fm
    if (!hasExistingData || existingData.length < 2) {
      // Fetch from Setlist.fm
      try {
        const setlistData = await retryableFetch(() => fetchSetlistFmData(artist.name));
        await processSetlistData(artistId, setlistData.setlists);
        
        // Update the artist with MBID if we don't have it
        if (!artist.setlist_fm_mbid) {
          await supabase
            .from('artists')
            .update({ setlist_fm_mbid: setlistData.mbid })
            .eq('id', artistId);
        }
      } catch (error) {
        console.error('Error fetching from Setlist.fm:', error);
        // Continue with existing data if available
      }
      
      // Fetch the data again after sync
      const { data: refreshedData } = await supabase
        .from('shows')
        .select(`
          id, 
          date, 
          venue, 
          city,
          setlists:setlists(
            id, 
            songs:songs(id, title, vote_count)
          )
        `)
        .eq('artist_id', artistId)
        .order('date', { ascending: false })
        .limit(50);
      
      if (refreshedData && refreshedData.length > 0) {
        return NextResponse.json({ 
          data: refreshedData,
          fromCache: false
        });
      }
    }
    
    // Return the existing data if we have it
    return NextResponse.json({ 
      data: existingData || [],
      fromCache: true
    });
  } catch (error) {
    console.error('Setlist fetch error:', error);
    
    // Log the error
    await supabase
      .from('error_logs')
      .insert({
        endpoint: 'setlist-api',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
    return NextResponse.json(
      { error: 'Failed to fetch setlists' },
      { status: 500 }
    );
  }
} 