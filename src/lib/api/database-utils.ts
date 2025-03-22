import { supabase } from "@/integrations/supabase/client";
import { fetchAndStoreArtistTracks } from "./database";

/**
 * Save an artist to the database, handling permission errors gracefully
 */
export async function saveArtistToDatabase(artist: any) {
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
        // If we get a permission error, log but continue (return the original artist)
        if (checkError.code === '42501') { // permission denied error
          console.log(`Permission denied when checking artist ${artist.name} in database - continuing with API data`);
          return artist;
        }
        
        console.error("Error checking artist in database:", checkError);
        return artist; // Return the original artist even if DB check fails
      }
      
      // If artist exists and was updated recently, don't update
      if (existingArtist) {
        const lastUpdated = new Date(existingArtist.updated_at);
        const now = new Date();
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        
        // Only update if it's been more than 7 days
        if (daysSinceUpdate < 7) {
          console.log(`Artist ${artist.name} was updated ${daysSinceUpdate.toFixed(1)} days ago, skipping update`);
          
          // If artist has Spotify ID but no tracks, fetch them in background
          if (existingArtist.spotify_id && !artist.stored_tracks) {
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
      upcoming_shows: artist.upcomingShows || 0,
      updated_at: new Date().toISOString()
    };
    
    // Insert or update artist
    try {
      const { data, error } = await supabase
        .from('artists')
        .upsert(artistData)
        .select();
      
      if (error) {
        // If we get a permission error, log but continue (return the original artist)
        if (error.code === '42501') { // permission denied error
          console.log(`Permission denied when saving artist ${artist.name} to database - continuing with API data`);
          return artist;
        }
        
        console.error("Error saving artist to database:", error);
        return artist; // Return the original artist even if DB save fails
      }
      
      console.log(`Successfully saved artist ${artist.name} to database`);
      
      // If artist has Spotify ID, fetch their tracks in the background
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
 * Save a venue to the database, handling permission errors gracefully
 */
export async function saveVenueToDatabase(venue: any) {
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
        // If we get a permission error, log but continue (return the original venue)
        if (checkError.code === '42501') { // permission denied error
          console.log(`Permission denied when checking venue ${venue.name} in database - continuing with API data`);
          return venue;
        }
        
        console.error("Error checking venue in database:", checkError);
        return venue; // Return the original venue even if DB check fails
      }
      
      // If venue exists and was updated recently, don't update
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
          location: venue.location,
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (error) {
        // If we get a permission error, log but continue (return the original venue)
        if (error.code === '42501') { // permission denied error
          console.log(`Permission denied when saving venue ${venue.name} to database - continuing with API data`);
          return venue;
        }
        
        console.error("Error saving venue to database:", error);
        return venue; // Return the original venue even if DB save fails
      }
      
      console.log(`Successfully saved venue ${venue.name} to database`);
      return data?.[0] || venue;
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
 * Save a show to the database, handling permission errors gracefully
 */
export async function saveShowToDatabase(show: any) {
  try {
    if (!show || !show.id) {
      console.error("Invalid show object:", show);
      return null;
    }
    
    console.log(`Processing show: ${show.name} (ID: ${show.id})`);
    
    // Check if show already exists
    try {
      const { data: existingShow, error: checkError } = await supabase
        .from('shows')
        .select('id, updated_at, artist_id, venue_id')
        .eq('id', show.id)
        .maybeSingle();
      
      if (checkError) {
        // If we get a permission error, log but continue (return the original show)
        if (checkError.code === '42501') { // permission denied error
          console.log(`Permission denied when checking show ${show.name} in database - continuing with API data`);
          return show;
        }
        
        console.error("Error checking show in database:", checkError);
        return show; // Return the original show even if DB check fails
      }
      
      // If show exists and was updated recently, don't update
      if (existingShow) {
        const lastUpdated = new Date(existingShow.updated_at);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        // Only update if it's been more than 24 hours
        if (hoursSinceUpdate < 24) {
          console.log(`Show ${show.name} was updated ${hoursSinceUpdate.toFixed(1)} hours ago, skipping update`);
          
          // Even if we're skipping the update, ensure the show has a setlist
          if (!existingShow.setlist_id) {
            await ensureSetlistExists(existingShow.id, existingShow.artist_id);
          }
          
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
    
    // Save the artist and venue first if needed
    let artistId = show.artist_id;
    let venueId = show.venue_id;
    
    if (show.artist && typeof show.artist === 'object') {
      const savedArtist = await saveArtistToDatabase(show.artist);
      artistId = savedArtist?.id || artistId;
    }
    
    if (show.venue && typeof show.venue === 'object') {
      const savedVenue = await saveVenueToDatabase(show.venue);
      venueId = savedVenue?.id || venueId;
    }
    
    // Insert or update the show
    try {
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
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (error) {
        // If we get a permission error, log but continue
        if (error.code === '42501') {
          console.log(`Permission denied when saving show ${show.name}`);
          return show;
        }
        
        console.error("Error saving show to database:", error);
        return show;
      }
      
      const savedShow = data?.[0] || show;
      console.log(`Successfully saved show ${show.name} to database`);
      
      // IMPORTANT: Ensure this show has a setlist automatically
      const setlistId = await ensureSetlistExists(savedShow.id, artistId);
      console.log(`Ensured setlist exists for show ${savedShow.id}, setlist ID: ${setlistId}`);
      
      if (setlistId) {
        // Update the show with the setlist ID if needed
        if (!savedShow.setlist_id) {
          const { error: updateError } = await supabase
            .from('shows')
            .update({ setlist_id: setlistId })
            .eq('id', savedShow.id);
          
          if (updateError) {
            console.warn(`Couldn't update show with setlist ID: ${updateError.message}`);
          }
        }
        
        // Return the full data with setlist info
        return { ...savedShow, setlist_id: setlistId };
      }
      
      return savedShow;
    } catch (saveError) {
      console.error("Error in saveShowToDatabase:", saveError);
      return show;
    }
  } catch (error) {
    console.error("Unexpected error in saveShowToDatabase:", error);
    return show;
  }
}

/**
 * Ensure a setlist exists for a show, creating one if needed
 */
async function ensureSetlistExists(showId: string, artistId: string) {
  try {
    // Check if this show already has a setlist
    const { data: existingSetlist, error: checkError } = await supabase
      .from('setlists')
      .select('id')
      .eq('show_id', showId)
      .maybeSingle();
    
    if (checkError) {
      console.error(`Error checking for existing setlist: ${checkError.message}`);
      return null;
    }
    
    // If setlist already exists, return its ID
    if (existingSetlist) {
      console.log(`Setlist already exists for show ${showId}: ${existingSetlist.id}`);
      return existingSetlist.id;
    }
    
    // Create a new setlist
    console.log(`Creating new setlist for show ${showId}`);
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert({ show_id: showId })
      .select()
      .single();
    
    if (createError) {
      console.error(`Error creating setlist: ${createError.message}`);
      return null;
    }
    
    // Now populate the setlist with songs from the artist's catalog
    await populateSetlistWithSongs(newSetlist.id, artistId);
    
    return newSetlist.id;
  } catch (error) {
    console.error(`Error ensuring setlist exists: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Populate a setlist with songs from the artist's catalog
 */
async function populateSetlistWithSongs(setlistId: string, artistId: string) {
  try {
    // Get the artist's Spotify ID
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('spotify_id')
      .eq('id', artistId)
      .maybeSingle();
    
    if (artistError || !artist?.spotify_id) {
      console.log(`Can't get Spotify ID for artist ${artistId}: ${artistError?.message || 'No Spotify ID'}`);
      return false;
    }
    
    // Try to get tracks from our database first
    const { data: tracks, error: tracksError } = await supabase
      .from('artist_tracks')
      .select('*')
      .eq('artist_id', artistId)
      .order('popularity', { ascending: false })
      .limit(10);
    
    if (tracksError || !tracks?.length) {
      console.log(`No stored tracks for artist ${artistId}, fetching from Spotify`);
      
      // Import the required function dynamically to avoid circular dependencies
      const { getArtistTopTracks } = await import('../spotify/top-tracks');
      if (!getArtistTopTracks) {
        console.error('Could not import getArtistTopTracks function');
        return false;
      }
      
      // Fetch top tracks from Spotify
      const spotifyTracks = await getArtistTopTracks(artist.spotify_id);
      if (!spotifyTracks?.length) {
        console.log(`No tracks found on Spotify for artist ${artistId}`);
        return false;
      }
      
      // Add 5 random tracks from top tracks to the setlist
      const randomTracks = spotifyTracks
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);
      
      for (const track of randomTracks) {
        await supabase.from('setlist_songs').insert({
          setlist_id: setlistId,
          spotify_id: track.id,
          title: track.name,
          duration_ms: track.duration_ms,
          preview_url: track.preview_url,
          album_name: track.album?.name,
          album_image_url: track.album?.images?.[0]?.url,
          votes: 0
        });
      }
    } else {
      // Use tracks from database
      const randomTracks = tracks
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);
      
      for (const track of randomTracks) {
        await supabase.from('setlist_songs').insert({
          setlist_id: setlistId,
          spotify_id: track.spotify_id,
          title: track.name,
          duration_ms: track.duration_ms,
          preview_url: track.preview_url,
          album_name: track.album_name,
          album_image_url: track.album_image_url,
          votes: 0
        });
      }
    }
    
    console.log(`Successfully populated setlist ${setlistId} with songs`);
    return true;
  } catch (error) {
    console.error(`Error populating setlist: ${(error as Error).message}`);
    return false;
  }
}
