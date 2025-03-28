import { supabase } from "@/integrations/supabase/client";
import { fetchAndStoreArtistTracks } from "./database";
import { syncVenueShows } from "@/app/api/sync/venue";
// Import createSetlistForShow dynamically to avoid circular dependencies

// Define interfaces for the data objects
interface Artist {
  id: string;
  name: string;
  image?: string;
  spotify_id?: string;
  spotify_url?: string;
  popularity?: number;
  followers?: number;
  genres?: string[];
  updated_at?: string;
}

interface Venue {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  postal_code?: string;
  image_url?: string;
  updated_at?: string;
}

interface Show {
  id: string;
  name?: string;
  date?: string;
  ticket_url?: string;
  image_url?: string;
  artist_id?: string;
  venue_id?: string;
  popularity?: number;
  artist?: Artist;
  venue?: Venue;
  updated_at?: string;
  setlist_id?: string;
}

/**
 * Save an artist to the database handling permission errors gracefully
 */
export async function saveArtistToDatabase(artist: Artist) {
  try {
    if (!artist || !artist.id || !artist.name) {
      console.error("Invalid artist object:", artist);
      return null;
    }

    console.log(`Saving artist to database: ${artist.name} (ID: ${artist.id})`);

    // Check if artist already exists
    try {
      const { data: existingArtist, error: checkError } = await supabase
        .from('artists')
        .select('id, updated_at, spotify_id')
        .eq('id', artist.id)
        .maybeSingle();

      if (checkError) {
        // If we get a permission error log but continue (return the original artist)
        if (checkError.code === '42501') { // permission denied error
          console.log(`Permission denied when checking artist ${artist.name} in database - continuing with API data`);
          return artist;
        }

        console.error("Error checking artist in database:", checkError);
        return artist; // Return the original artist even if DB check fails
      }

      // If artist exists and was updated recently don't update
      if (existingArtist) {
        const lastUpdated = new Date(existingArtist.updated_at);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

        // Only update if it's been more than 7 days
        if (daysSinceUpdate < 7) {
          console.log(`Artist ${artist.name} was updated ${daysSinceUpdate.toFixed(1)} days ago, skipping update`);

          // If artist has Spotify ID but no tracks fetch them in background
          if (existingArtist.spotify_id && artist.spotify_id) {
            fetchAndStoreArtistTracks(existingArtist.id, existingArtist.spotify_id, artist.name)
              .catch(err => console.error(`Background track fetch error:`, err));
          }

          return existingArtist;
        }

        console.log(`Artist ${artist.name} needs update (last updated ${daysSinceUpdate.toFixed(1)} days ago)`);
      } else {
        console.log(`Artist ${artist.name} is new, creating in database`);
      }
    } catch (checkError) {
      console.error("Error checking if artist exists:", checkError);
      // Continue to try adding the artist anyway
    }

    // Prepare artist data
    const artistData = {
      id: artist.id,
      name: artist.name,
      image_url: artist.image,
      spotify_id: artist.spotify_id,
      spotify_url: artist.spotify_url,
      popularity: artist.popularity || 0,
      followers: artist.followers || 0,
      updated_at: new Date().toISOString()
    };

    // Insert or update artist
    try {
      const { data, error } = await supabase
        .from('artists')
        .upsert(artistData)
        .select();

      if (error) {
        // If we get a permission error log but continue (return the original artist)
        if (error.code === '42501') { // permission denied error
          console.log(`Permission denied when saving artist ${artist.name} to database - continuing with API data`);
          return artist;
        }

        console.error("Error saving artist to database:", error);
        return artist; // Return the original artist even if DB save fails
      }

      console.log(`Successfully saved artist ${artist.name} to database`);

      // If artist has Spotify ID fetch their tracks in the background
      if (artist.spotify_id) {
        fetchAndStoreArtistTracks(artist.id, artist.spotify_id, artist.name)
          .catch(err => console.error(`Error fetching tracks for artist ${artist.name}:`, err));
      }

      return data?.[0] || artist;
    } catch (saveError) {
      console.error("Error in saveArtistToDatabase:", saveError);
      return artist; // Return the original artist even if DB save fails
    }
  } catch (error) {
    console.error("Unexpected error in saveArtistToDatabase:", error);
    return artist; // Return the original artist even if unexpected error occurs
  }
}

/**
 * Save a venue to the database handling permission errors gracefully
 */
export async function saveVenueToDatabase(venue: Venue) {
  try {
    if (!venue || !venue.id || !venue.name) {
      console.error("Invalid venue object:", venue);
      return null;
    }

    console.log(`Processing venue: ${venue.name} (ID: ${venue.id})`);

    // Check if venue already exists
    try {
      const { data: existingVenue, error: checkError } = await supabase
        .from('venues')
        .select('id, updated_at')
        .eq('id', venue.id)
        .maybeSingle();

      if (checkError) {
        // If we get a permission error log but continue (return the original venue)
        if (checkError.code === '42501') { // permission denied error
          console.log(`Permission denied when checking venue ${venue.name} in database - continuing with API data`);
          return venue;
        }

        console.error("Error checking venue in database:", checkError);
        return venue; // Return the original venue even if DB check fails
      }

      // If venue exists and was updated recently don't update
      if (existingVenue) {
        const lastUpdated = new Date(existingVenue.updated_at);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

        // Only update if it's been more than 30 days
        if (daysSinceUpdate < 30) {
          console.log(`Venue ${venue.name} was updated ${daysSinceUpdate.toFixed(1)} days ago, skipping update`);
          return existingVenue;
        }

        console.log(`Venue ${venue.name} needs update (last updated ${daysSinceUpdate.toFixed(1)} days ago)`);
      } else {
        console.log(`Venue ${venue.name} is new, creating in database`);
      }
    } catch (checkError) {
      console.error("Error checking if venue exists:", checkError);
      // Continue to try adding the venue anyway
    }

    // Insert or update venue
    try {
      const { data, error } = await supabase
        .from('venues')
        .upsert({
          id: venue.id,
          name: venue.name,
          city: venue.city,
          state: venue.state,
          country: venue.country,
          address: venue.address,
          postal_code: venue.postal_code,
          image_url: venue.image_url,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // If we get a permission error log but continue (return the original venue)
        if (error.code === '42501') { // permission denied error
          console.log(`Permission denied when saving venue ${venue.name} to database - continuing with API data`);
          return venue;
        }

        console.error("Error saving venue to database:", error);
        return venue; // Return the original venue even if DB save fails
      }

      console.log(`Successfully saved venue ${venue.name} to database`);
      
      return data || venue; // Return saved data or original object
    } catch (saveError) {
      console.error("Error in saveVenueToDatabase:", saveError);
      return venue; // Return the original venue even if DB save fails
    }
  } catch (error) {
    console.error("Unexpected error in saveVenueToDatabase:", error);
    return venue; // Return the original venue even if unexpected error occurs
  }
}

/**
 * Save a show to the database, optionally triggering a full venue sync.
 * Handles permission errors gracefully.
 * @param show The show object to save.
 * @param triggeredBySync Flag to prevent infinite sync loops. Defaults to false.
 */
export async function saveShowToDatabase(show: Show, triggeredBySync: boolean = false) {
  try {
    if (!show || !show.id) {
      console.error("Invalid show object:", show);
      return null;
    }

    console.log(`Processing show: ${show.name} (ID: ${show.id})${triggeredBySync ? ' [Sync Triggered]' : ''}`);

    // Check if show already exists
    try {
      const { data: existingShow, error: checkError } = await supabase
        .from('shows')
        .select('id, updated_at, artist_id, venue_id')
        .eq('id', show.id)
        .maybeSingle();

      if (checkError) {
        // If we get a permission error log but continue (return the original show)
        if (checkError.code === '42501') { // permission denied error
          console.log(`Permission denied when checking show ${show.name} in database - continuing with API data`);
          return show;
        }

        console.error("Error checking show in database:", checkError);
        return show; // Return the original show even if DB check fails
      }

      // If show exists and was updated recently don't update
      if (existingShow) {
        const lastUpdated = new Date(existingShow.updated_at);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

        // Only update if it's been more than 24 hours
        if (hoursSinceUpdate < 24) {
          console.log(`Show ${show.name} was updated ${hoursSinceUpdate.toFixed(1)} hours ago, skipping update`);
          return existingShow;
        }

        console.log(`Show ${show.name} needs update (last updated ${hoursSinceUpdate.toFixed(1)} hours ago)`);
      } else {
        console.log(`Show ${show.name} is new, creating in database`);
      }
    } catch (checkError) {
      console.error("Error checking if show exists:", checkError);
      // Continue to try adding the show anyway
    }

    // Ensure artist and venue exist before saving the show
    let artistId = show.artist_id;
    let venueId = show.venue_id;
    let venueName = show.venue?.name; // Store venue name for the async sync call

    if (show.artist && typeof show.artist === 'object') {
      // Pass triggeredBySync flag down if necessary, though saveArtistToDatabase doesn't trigger venue sync directly
      const savedArtist = await saveArtistToDatabase(show.artist);
      artistId = savedArtist?.id || artistId;
    }

    if (show.venue && typeof show.venue === 'object') {
      // Pass triggeredBySync flag down if saveVenueToDatabase also needs loop prevention
      const savedVenue = await saveVenueToDatabase(show.venue);
      venueId = savedVenue?.id || venueId;
      venueName = savedVenue?.name || venueName; // Get venue name from saved venue if possible
    }

    // Abort if essential IDs are missing after trying to save artist/venue
    if (!artistId || !venueId) {
      console.error(`Cannot save show ${show.name}, missing artistId (${artistId}) or venueId (${venueId})`);
      return show; // Return original data as we couldn't save properly
    }

    // Upsert the show
    const { data, error } = await supabase
      .from('shows')
      .upsert({
        id: show.id,
        name: show.name,
        date: show.date,
        ticket_url: show.ticket_url,
        image_url: show.image_url,
        artist_id: artistId,
        venue_id: venueId,
        popularity: show.popularity || 0,
        updated_at: new Date().toISOString()
      })
      .select()
      .single(); // Use single() if upsert returns an array with one item

    if (error) {
      if (error.code === '42501') {
        console.log(`Permission denied when saving show ${show.name}`);
        return show; // Return original object on permission error
      }
      console.error("Error saving show to database:", error);
      return show; // Return original object on other errors
    }

    const savedShow = data; // data should be the single saved show object
    console.log(`Successfully saved show ${show.name} to database`);

    // --- Trigger Background Sync ---
    if (!triggeredBySync && venueId && venueName) {
      console.log(`Triggering background sync for venue: ${venueName} (${venueId})`);
      // Call syncVenueShows without awaiting it
      syncVenueShows(venueId, venueName).catch(syncError => {
        console.error(`Background venue sync failed for ${venueName} (${venueId}):`, syncError);
        // Optionally log this specific error to your error_logs table
      });
    } else if (triggeredBySync) {
        console.log(`Skipping venue sync for show ${show.name} because it was triggered by a sync.`);
    } else if (!venueId || !venueName) {
        console.warn(`Cannot trigger venue sync for show ${show.name}, missing venueId or venueName.`);
    }
    // --- End Trigger Background Sync ---

    // Create a setlist for *this specific* show (existing logic)
    const setlistId = await createSetlistDirectly(savedShow.id, artistId);
    if (setlistId) {
      console.log(`Created setlist for show ${savedShow.id}: ${setlistId}`);
      // Return the saved show merged with its new setlist_id
      return { ...savedShow, setlist_id: setlistId };
    }

    return savedShow; // Return the saved show object

  } catch (error) {
    console.error("Unexpected error in saveShowToDatabase:", error);
    return show; // Return original object on unexpected errors
  }
}

/**
 * Create a setlist for a show and populate it with songs - directly implemented
 * to avoid circular dependencies
 */
async function createSetlistDirectly(showId: string, artistId: string) {
  try {
    console.log(`Creating setlist for show ${showId}`);
    
    // Check if setlist already exists
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing setlist:", checkError);
      return null;
    }
    
    // If setlist exists, return its ID
    if (existingSetlist) {
      console.log(`Setlist already exists for show ${showId}: ${existingSetlist.id}`);
      return existingSetlist.id;
    }
    
    // Get show details for date and venue information
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('date, venue_id, venues(name, city)')
      .eq('id', showId)
      .single();
    
    if (showError || !show) {
      console.error("Error getting show details:", showError);
      return null;
    }
    
    // Create new setlist
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({
        artist_id: artistId,
        show_id: showId,
        date: show.date,
        venue: show.venues?.name || null,
        venue_city: show.venues?.city || null,
      })
      .select()
      .single();
    
    if (createError) {
      console.error("Error creating setlist:", createError);
      return null;
    }
    
    console.log(`Created setlist ${newSetlist.id} for show ${showId}`);
    
    // Populate setlist with songs
    await populateSetlistSongs(newSetlist.id, artistId);
    
    return newSetlist.id;
  } catch (error) {
    console.error("Error in createSetlistDirectly:", error);
    return null;
  }
}

/**
 * Populate setlist with songs from the artist's catalog
 */
async function populateSetlistSongs(setlistId: string, artistId: string) {
  try {
    // Get artist's songs from the database
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('id, name, spotify_id, duration_ms, preview_url, popularity')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(50);
    
    if (songsError) {
      console.error("Error fetching songs for setlist:", songsError);
      return false;
    }
    
    // If we don't have songs, fetch them from Spotify
    if (!songs || songs.length === 0) {
      // Get the artist's Spotify ID
      const { data: artist, error: artistError } = await supabase
        .from('artists')
        .select('spotify_id')
        .eq('id', artistId)
        .maybeSingle();
      
      if (artistError || !artist?.spotify_id) {
        console.error("Error getting artist Spotify ID:", artistError);
        return false;
      }
      
      // Fetch songs from Spotify
      await fetchAndStoreArtistTracks(artistId, artist.spotify_id, "Artist");
      
      // Try again to get songs
      const { data: refreshedSongs, error: refreshError } = await supabase
        .from('songs')
        .select('id, name, spotify_id, duration_ms, preview_url, popularity')
        .eq('artist_id', artistId)
        .order('popularity', { ascending: false })
        .limit(50);
      
      if (refreshError || !refreshedSongs || refreshedSongs.length === 0) {
        console.error("Still couldn't get songs after fetching from Spotify:", refreshError);
        return false;
      }
      
      // Add songs to setlist
      return await addSongsToSetlistInternal(setlistId, artistId, refreshedSongs);
    }
    
    // Add songs to setlist if we have them
    return await addSongsToSetlistInternal(setlistId, artistId, songs);
  } catch (error) {
    console.error("Error in populateSetlistSongs:", error);
    return false;
  }
}

/**
 * Add songs to a setlist - internal implementation
 */
async function addSongsToSetlistInternal(setlistId: string, artistId: string, songs: {
  id: string;
  name: string;
  spotify_id?: string;
  duration_ms?: number;
  preview_url?: string | null;
  popularity?: number;
}[]) {
  try {
    // Select 5 random songs from the top songs
    const selectedSongs = songs
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    
    if (selectedSongs.length === 0) {
      console.error("No songs available to add to setlist");
      return false;
    }
    
    // Prepare setlist songs data
    const setlistSongs = selectedSongs.map((song, index) => ({
      setlist_id: setlistId,
      song_id: song.id,
      name: song.name,
      position: index + 1,
      artist_id: artistId,
      vote_count: 0
    }));
    
    // Insert setlist songs
    const { error } = await supabase
      .from('setlist_songs')
      .insert(setlistSongs);
    
    if (error) {
      console.error("Error adding songs to setlist:", error);
      return false;
    }
    
    console.log(`Added ${setlistSongs.length} songs to setlist ${setlistId}`);
    return true;
  } catch (error) {
    console.error("Error in addSongsToSetlistInternal:", error);
    return false;
  }
}
