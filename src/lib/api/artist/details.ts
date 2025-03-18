
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callTicketmasterApi } from "../ticketmaster-config";
import { saveArtistToDatabase, saveVenueToDatabase, saveShowToDatabase } from "../database-utils";
import { searchArtistsWithEvents } from "./search";
import { getArtistByName, getArtistAllTracks } from "@/lib/spotify";

/**
 * Fetch artist details by ID
 */
export async function fetchArtistById(artistId: string): Promise<any> {
  try {
    console.log(`Fetching artist details for ID: ${artistId}`);
    
    // First try to get from database
    const { data: artist, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching artist from database:", error);
    }
    
    if (artist) {
      console.log("Found artist in database:", artist.name);
      
      // If the artist exists but doesn't have stored_tracks, try to fetch them
      if (!artist.stored_tracks && artist.spotify_id) {
        console.log(`Artist ${artist.name} has no stored tracks but has Spotify ID. Fetching tracks...`);
        fetchAndUpdateArtistTracks(artist.id, artist.spotify_id, artist.name);
      }
      
      // If artist was updated more than 7 days ago, refresh the data in the background
      const lastUpdated = new Date(artist.updated_at || 0);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate > 7) {
        console.log(`Artist data is ${daysSinceUpdate.toFixed(1)} days old. Refreshing in background.`);
        // Don't await - let this run in the background
        refreshArtistDataFromTicketmaster(artistId, artist.name);
      }
      
      // Return the artist from DB immediately
      return artist;
    }
    
    console.log("Artist not found in database. Fetching from Ticketmaster...");
    
    // If not in database, fetch from Ticketmaster for non-tm- prefixed IDs
    if (!artistId.startsWith('tm-')) {
      // For actual TM IDs, fetch using attraction endpoint
      try {
        const data = await callTicketmasterApi(`attractions/${artistId}.json`);
        
        if (!data) {
          throw new Error("Artist not found");
        }
        
        const artistData = {
          id: data.id,
          name: data.name,
          image: data.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          genres: [],
          upcomingShows: 0  // We'll count these when we fetch shows
        };
        
        if (data.classifications && data.classifications.length > 0) {
          if (data.classifications[0].genre?.name) {
            artistData.genres.push(data.classifications[0].genre.name);
          }
          if (data.classifications[0].subGenre?.name) {
            artistData.genres.push(data.classifications[0].subGenre.name);
          }
        }
        
        // Look up Spotify ID by artist name
        try {
          const spotifyArtist = await getArtistByName(artistData.name);
          if (spotifyArtist && spotifyArtist.id) {
            console.log(`Found Spotify ID ${spotifyArtist.id} for artist ${artistData.name}`);
            artistData.spotify_id = spotifyArtist.id;
            
            // Fetch and add tracks to the artist before saving
            const tracks = await getArtistAllTracks(spotifyArtist.id);
            if (tracks && tracks.tracks && tracks.tracks.length > 0) {
              console.log(`Found ${tracks.tracks.length} tracks for artist ${artistData.name}`);
              artistData.stored_tracks = tracks.tracks;
            }
          }
        } catch (spotifyError) {
          console.error(`Error fetching Spotify details for ${artistData.name}:`, spotifyError);
        }
        
        // Also fetch the upcoming shows for this artist
        await fetchAndSaveArtistShows(artistId);
        
        // Save to database
        const savedArtist = await saveArtistToDatabase(artistData);
        return savedArtist || artistData;
      } catch (fetchError) {
        console.error("Error fetching artist by ID:", fetchError);
        // Fall back to keyword search
      }
    }
    
    // For tm- prefixed IDs or if attraction endpoint failed, extract name and search
    const searchTerm = artistId.startsWith('tm-') 
      ? decodeURIComponent(artistId.replace('tm-', '')).replace(/-/g, ' ')
      : artistId;
    
    console.log(`Searching for artist by name: ${searchTerm}`);
    // Search for artist by name
    const artists = await searchArtistsWithEvents(searchTerm, 1);
    
    if (artists.length > 0) {
      return artists[0];
    }
    
    throw new Error("Artist not found");
  } catch (error) {
    console.error("Error in fetchArtistById:", error);
    toast.error("Failed to load artist details");
    throw error;
  }
}

/**
 * Fetch and save shows for an artist
 */
async function fetchAndSaveArtistShows(artistId: string): Promise<void> {
  try {
    console.log(`Fetching shows for artist ID: ${artistId}`);
    
    // Call Ticketmaster API to get events for this artist
    const data = await callTicketmasterApi('events.json', {
      attractionId: artistId,
      sort: 'date,asc',
      size: '50'  // Get up to 50 shows
    });
    
    if (!data._embedded?.events) {
      console.log(`No upcoming shows found for artist ID: ${artistId}`);
      return;
    }
    
    console.log(`Found ${data._embedded.events.length} shows for artist ID: ${artistId}`);
    let upcomingShowsCount = 0;
    
    // Process and save each show
    for (const event of data._embedded.events) {
      try {
        const venueName = event._embedded?.venues?.[0]?.name || 'Unknown Venue';
        const venueId = event._embedded?.venues?.[0]?.id || `venue-${encodeURIComponent(venueName.toLowerCase().replace(/\s+/g, '-'))}`;
        
        // Save venue first
        const venueData = {
          id: venueId,
          name: venueName,
          city: event._embedded?.venues?.[0]?.city?.name,
          state: event._embedded?.venues?.[0]?.state?.name,
          country: event._embedded?.venues?.[0]?.country?.name,
          address: event._embedded?.venues?.[0]?.address?.line1,
          postal_code: event._embedded?.venues?.[0]?.postalCode,
          location: event._embedded?.venues?.[0]?.location
            ? { 
                latitude: event._embedded.venues[0].location.latitude, 
                longitude: event._embedded.venues[0].location.longitude 
              }
            : null
        };
        
        await saveVenueToDatabase(venueData);
        
        // Now save the show
        const showData = {
          id: event.id,
          name: event.name,
          date: event.dates?.start?.dateTime,
          artist_id: artistId,
          venue_id: venueId,
          ticket_url: event.url,
          image_url: event.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          genre_ids: event.classifications?.map((c: any) => c.genre?.id).filter(Boolean) || []
        };
        
        await saveShowToDatabase(showData);
        upcomingShowsCount++;
      } catch (showError) {
        console.error(`Error saving show ${event.id}:`, showError);
      }
    }
    
    // Update the artist with the count of upcoming shows
    if (upcomingShowsCount > 0) {
      await supabase
        .from('artists')
        .update({ upcoming_shows: upcomingShowsCount, updated_at: new Date().toISOString() })
        .eq('id', artistId);
    }
  } catch (error) {
    console.error(`Error fetching shows for artist ${artistId}:`, error);
  }
}

/**
 * Refresh artist data in the background
 */
async function refreshArtistDataFromTicketmaster(artistId: string, artistName: string): Promise<void> {
  try {
    console.log(`Refreshing data for artist ${artistName} (${artistId})`);
    
    // Fetch fresh data from Ticketmaster
    if (!artistId.startsWith('tm-')) {
      const data = await callTicketmasterApi(`attractions/${artistId}.json`);
      if (data) {
        const artistData = {
          id: data.id,
          name: data.name,
          image: data.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url,
          genres: data.classifications?.map((c: any) => c.genre?.name).filter(Boolean) || [],
          updated_at: new Date().toISOString()
        };
        
        await supabase
          .from('artists')
          .update(artistData)
          .eq('id', artistId);
      }
    }
    
    // Always fetch and update the shows
    await fetchAndSaveArtistShows(artistId);
    
    console.log(`Finished refreshing data for artist ${artistName}`);
  } catch (error) {
    console.error(`Error refreshing data for artist ${artistId}:`, error);
  }
}

/**
 * Fetch and update artist tracks
 */
async function fetchAndUpdateArtistTracks(artistId: string, spotifyId: string, artistName: string): Promise<void> {
  try {
    console.log(`Fetching tracks for artist ${artistName} (${spotifyId})`);
    
    const tracks = await getArtistAllTracks(spotifyId);
    
    if (tracks && tracks.tracks && tracks.tracks.length > 0) {
      console.log(`Found ${tracks.tracks.length} tracks for artist ${artistName}`);
      
      await supabase
        .from('artists')
        .update({ 
          stored_tracks: tracks.tracks,
          tracks_last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', artistId);
    }
  } catch (error) {
    console.error(`Error fetching tracks for artist ${artistId}:`, error);
  }
}
