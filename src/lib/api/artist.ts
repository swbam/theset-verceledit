import { Artist, Show, Setlist, Song } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { handleError, ErrorSource } from '@/lib/error-handling';
import { callTicketmasterApi } from './ticketmaster-config';

export async function fetchArtistById(id: string): Promise<Artist | null> {
  try {
    const { data: artist, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching artist:', error);
      throw error;
    }

    return artist;
  } catch (error) {
    console.error('Error in fetchArtistById:', error);
    throw error;
  }
}

export async function searchArtists(query: string): Promise<Artist[]> {
  try {
    const { data: artists, error } = await supabase
      .from('artists')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error) {
      console.error('Error searching artists:', error);
      throw error;
    }

    return artists || [];
  } catch (error) {
    console.error('Error in searchArtists:', error);
    throw error;
  }
}

export async function createArtist(artistData: { name: string } & Partial<Artist>): Promise<Artist> {
  try {
    const { data: artist, error } = await supabase
      .from('artists')
      .insert(artistData)
      .select()
      .single();

    if (error) {
      console.error('Error creating artist:', error);
      throw error;
    }

    return artist;
  } catch (error) {
    console.error('Error in createArtist:', error);
    throw error;
  }
}

export async function updateArtist(id: string, updates: Partial<Omit<Artist, 'id'>>): Promise<Artist> {
  try {
    const { data: artist, error } = await supabase
      .from('artists')
      .update({ ...updates })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating artist:', error);
      throw error;
    }

    return artist;
  } catch (error) {
    console.error('Error in updateArtist:', error);
    throw error;
  }
}

export async function importArtistFromTicketmaster(tmArtistId: string): Promise<Artist> {
  try {
    // First check if artist already exists
    const { data: existingArtist } = await supabase
      .from('artists')
      .select('*')
      .eq('ticketmaster_id', tmArtistId)
      .single();

    if (existingArtist) {
      console.log('Artist already exists:', existingArtist);
      return existingArtist;
    }

    // Fetch artist data from Ticketmaster
    const response = await callTicketmasterApi(`attractions/${tmArtistId}`);
    const tmArtist = response;

    // Create new artist record
    const artistData = {
      name: tmArtist.name || '',
      ticketmaster_id: tmArtist.id || '',
      spotify_id: tmArtist.externalLinks?.spotify?.[0]?.url?.split('/').pop() || undefined,
      image_url: tmArtist.images?.[0]?.url || undefined,
      spotify_url: tmArtist.externalLinks?.spotify?.[0]?.url || undefined,
      genres: tmArtist.classifications?.[0]?.genre?.name ? [tmArtist.classifications[0].genre.name] : undefined,
      popularity: undefined,
      followers: undefined,
      sync_status: {
        ticketmaster: 'pending',
        spotify: 'pending'
      },
      deleted_at: null
      sync_status: {
        ticketmaster: 'pending',
        spotify: 'pending'
      },
      deleted_at: null,
      sync_status: {
        ticketmaster: 'pending',
        spotify: 'pending'
      },
      deleted_at: null,
      sync_status: {
        ticketmaster: 'pending',
        spotify: 'pending'
      }
    };

    const { data: artist, error } = await supabase
      .from('artists')
      .insert(artistData)
      .select()
      .single();

    if (error) {
      console.error('Error creating artist:', error);
      throw error;
    }

    // Trigger sync process via the API route
    fetch('/api/artists/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'artist',
        ticketmasterId: tmArtistId,
        spotifyId: artistData.spotify_id,
        options: {
          skipDependencies: false
        }
      }),
    }).catch(fetchError => {
      // Log error but don't block the return of the created artist
      console.error('Error triggering background sync after TM import:', fetchError);
      handleError({
        message: 'Background sync trigger failed after TM import',
        source: ErrorSource.Client,
        originalError: fetchError
      });
    });

    return artist;
  } catch (error) {
    handleError({
      message: 'Error importing artist from Ticketmaster',
      source: ErrorSource.Client,
      originalError: error
    });
    throw error;
  }
}

export async function importArtistFromSpotify(spotifyId: string): Promise<Artist> {
  try {
    // First check if artist already exists
    const { data: existingArtist } = await supabase
      .from('artists')
      .select('*')
      .eq('spotify_id', spotifyId)
      .single();

    if (existingArtist) {
      console.log('Artist already exists:', existingArtist);
      return existingArtist;
    }

    // Create new artist record with minimal data
    const artistData = {
      name: '',  // Will be populated by sync
      spotify_id: spotifyId,
      sync_status: {
        ticketmaster: 'pending',
        spotify: 'pending'
      }
    };

    const { data: artist, error } = await supabase
      .from('artists')
      .insert(artistData)
      .select()
      .single();

    if (error) {
      console.error('Error creating artist:', error);
      throw error;
    }

    // Trigger sync process via the API route
    fetch('/api/artists/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'artist',
        spotifyId,
        options: {
          skipDependencies: false
        }
      }),
    }).catch(fetchError => {
      // Log error but don't block the return of the created artist
      console.error('Error triggering background sync after Spotify import:', fetchError);
      handleError({
        message: 'Background sync trigger failed after Spotify import',
        source: ErrorSource.Client,
        originalError: fetchError
      });
    });

    return artist;
  } catch (error) {
    handleError({
      message: 'Error importing artist from Spotify',
      source: ErrorSource.Client,
      originalError: error
    });
    throw error;
  }
}

export async function getArtistShows(artistId: string): Promise<Show[]> {
  try {
    const { data: shows, error } = await supabase
      .from('shows')
      .select(`
        *,
        venue:venues(*)
      `)
      .eq('artist_id', artistId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching artist shows:', error);
      throw error;
    }

    return shows || [];
  } catch (error) {
    console.error('Error in getArtistShows:', error);
    throw error;
  }
}
