"use server";

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const adminClient = createClient(supabaseUrl, supabaseServiceKey);
const publicClient = createClient(supabaseUrl, supabaseAnonKey);

// Interfaces
interface SetlistFmSetlist {
  id: string;
  eventDate: string;
  artist: {
    mbid: string;
    name: string;
  };
  venue: {
    name: string;
    city: {
      name: string;
      country: {
        name: string;
      };
    };
  };
  tour?: {
    name: string;
  };
  sets: {
    set: Array<{
      song: Array<{
        name: string;
        info?: string;
      }>;
    }>;
  };
}

interface SetlistResponse {
  id: string;
  date: string;
  venue: string;
  city: string;
  songs: Array<{
    name: string;
    position: number;
  }>;
}

/**
 * Finds a corresponding show in the database using artist and date
 */
async function findMatchingShow(artistId: string, date: string) {
  // Allow a day before and after for matching
  const dayBefore = new Date(date);
  dayBefore.setDate(dayBefore.getDate() - 1);
  
  const dayAfter = new Date(date);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const { data, error } = await adminClient
    .from('shows')
    .select('*')
    .eq('artist_id', artistId)
    .gte('date', dayBefore.toISOString())
    .lte('date', dayAfter.toISOString())
    .order('date')
    .limit(1);

  if (error) {
    console.error('Error finding matching show:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Creates a setlist in the database
 */
async function createSetlist(showId: string, artistId: string, setlistFmId: string, date: string, venue: string, city: string) {
  const { data, error } = await adminClient
    .from('setlists')
    .insert({
      show_id: showId,
      artist_id: artistId,
      setlist_fm_id: setlistFmId,
      date,
      venue,
      venue_city: city
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating setlist:', error);
    return null;
  }

  return data;
}

/**
 * Adds songs to a setlist
 */
async function addSongsToSetlist(setlistId: string, songs: Array<{ name: string; position: number }>) {
  const songsWithSetlistId = songs.map(song => ({
    ...song,
    setlist_id: setlistId
  }));

  const { data, error } = await adminClient
    .from('setlist_songs')
    .insert(songsWithSetlistId)
    .select();

  if (error) {
    console.error('Error adding songs to setlist:', error);
    return false;
  }

  return true;
}

/**
 * Fetches a setlist from the Setlist.fm API and syncs it to the database
 */
export async function syncSetlistFromSetlistFm(artistId: string, setlistFmId: string): Promise<SetlistResponse | null> {
  // Check if we already have this setlist
  const { data: existingSetlist } = await adminClient
    .from('setlists')
    .select('*')
    .eq('setlist_fm_id', setlistFmId)
    .maybeSingle();

  if (existingSetlist) {
    console.log('Setlist already exists, returning existing data');
    
    // Get the songs for the existing setlist
    const { data: songs } = await adminClient
      .from('setlist_songs')
      .select('name, position')
      .eq('setlist_id', existingSetlist.id)
      .order('position');
    
    return {
      id: existingSetlist.id,
      date: existingSetlist.date,
      venue: existingSetlist.venue || '',
      city: existingSetlist.venue_city || '',
      songs: songs || []
    };
  }

  try {
    // Simulate fetching from Setlist.fm API
    // In a real scenario, you would make an actual API call to Setlist.fm
    // const response = await fetch(`https://api.setlist.fm/rest/1.0/setlist/${setlistFmId}`, {
    //   headers: {
    //     'Accept': 'application/json',
    'x-api-key': process.env.SETLIST_FM_API_KEY || ''
    //   }
    // });
    // if (!response.ok) throw new Error(`Failed to fetch setlist: ${response.status}`);
    // const setlistData: SetlistFmSetlist = await response.json();
    
    // For now, we'll use dummy data
    const setlistData: SetlistFmSetlist = {
      id: setlistFmId,
      eventDate: new Date().toISOString(),
      artist: {
        mbid: 'artist-mbid',
        name: 'Artist Name'
      },
      venue: {
        name: 'Venue Name',
        city: {
          name: 'City Name',
          country: {
            name: 'Country Name'
          }
        }
      },
      sets: {
        set: [
          {
            song: [
              { name: 'Song 1' },
              { name: 'Song 2' },
              { name: 'Song 3' }
            ]
          }
        ]
      }
    };

    // Find a matching show in our database
    const show = await findMatchingShow(artistId, setlistData.eventDate);
    
    if (!show) {
      console.error('No matching show found for this setlist');
      return null;
    }

    // Extract songs from the setlist
    const songs: Array<{ name: string; position: number }> = [];
    let position = 0;
    
    setlistData.sets.set.forEach(set => {
      set.song.forEach(song => {
        songs.push({
          name: song.name,
          position: position++
        });
      });
    });

    // Create the setlist
    const newSetlist = await createSetlist(
      show.id,
      artistId,
      setlistFmId,
      setlistData.eventDate,
      setlistData.venue.name,
      setlistData.venue.city.name
    );

    if (!newSetlist) {
      return null;
    }

    // Add songs to the setlist
    const success = await addSongsToSetlist(newSetlist.id, songs);

    if (!success) {
      return null;
    }

    return {
      id: newSetlist.id,
      date: newSetlist.date,
      venue: newSetlist.venue || '',
      city: newSetlist.venue_city || '',
      songs
    };
  } catch (error) {
    console.error('Error syncing setlist:', error);
    return null;
  }
} 