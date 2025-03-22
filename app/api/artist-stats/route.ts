import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCachedData } from '@/lib/api-helpers';
import { getArtistById } from '@/lib/spotify/artist-search';
import { getArtistAllTracks } from '@/lib/spotify/all-tracks';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetch artist statistics from Spotify, Ticketmaster, and our database
 * Returns popularity, followers, upcoming shows count, and other stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get('id');
  
  if (!artistId) {
    return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
  }
  
  try {
    // Use caching for better performance
    const stats = await getCachedData(
      `artist-stats-${artistId}`,
      async () => {
        // Get artist from database first
        const { data: artist, error } = await supabase
          .from('artists')
          .select(`
            id, 
            name,
            spotify_id,
            image_url,
            followers,
            popularity,
            genres,
            stored_tracks,
            last_updated
          `)
          .eq('id', artistId)
          .single();
        
        if (error || !artist) {
          throw new Error('Artist not found');
        }
        
        // Get upcoming shows count
        const { count: upcomingShowsCount } = await supabase
          .from('shows')
          .select('id', { count: 'exact', head: true })
          .eq('artist_id', artistId)
          .gte('date', new Date().toISOString());
        
        // Get total votes for this artist's songs
        const { data: votesData } = await supabase
          .rpc('get_artist_total_votes', { artist_id_param: artistId });
        
        const totalVotes = votesData || 0;
        
        // If we have Spotify ID, try to get fresh data from Spotify API
        let spotifyData = null;
        if (artist.spotify_id) {
          try {
            spotifyData = await getArtistById(artist.spotify_id);
            
            // Update artist in database with fresh Spotify data
            await supabase
              .from('artists')
              .update({
                followers: spotifyData.followers?.total || artist.followers,
                popularity: spotifyData.popularity || artist.popularity,
                genres: spotifyData.genres || artist.genres,
                last_updated: new Date().toISOString()
              })
              .eq('id', artistId);
          } catch (spotifyError) {
            console.error('Error fetching Spotify data:', spotifyError);
            // Continue with database data
          }
        }
        
        // Combine all stats
        return {
          id: artist.id,
          name: artist.name,
          spotify_id: artist.spotify_id,
          image_url: artist.image_url,
          followers: spotifyData?.followers?.total || artist.followers || 0,
          popularity: spotifyData?.popularity || artist.popularity || 0,
          genres: spotifyData?.genres || artist.genres || [],
          track_count: artist.stored_tracks ? 
            Array.isArray(artist.stored_tracks) ? artist.stored_tracks.length : 0 : 0,
          upcoming_shows_count: upcomingShowsCount || 0,
          total_votes: totalVotes,
          last_updated: artist.last_updated,
          spotify_url: spotifyData?.external_urls?.spotify || null
        };
      },
      60 // Cache for 60 minutes
    );
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching artist stats:', error);
    
    // Log the error
    await supabase
      .from('error_logs')
      .insert({
        endpoint: 'artist-stats',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    
    return NextResponse.json(
      { error: 'Failed to fetch artist stats' }, 
      { status: 500 }
    );
  }
} 