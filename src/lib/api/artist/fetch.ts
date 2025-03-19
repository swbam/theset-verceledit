
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callTicketmasterApi } from "../ticketmaster-config";
import { saveArtistToDatabase } from "../database";
import { searchArtistsWithEvents } from "./search";
import { getArtistByName, getArtistAllTracks } from "@/lib/spotify";
import { fetchAndSaveArtistShows } from "./shows";
import { refreshArtistData } from "./refresh";

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
        refreshArtistData(artistId, artist.name);
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
 * Fetch and update artist tracks
 */
export async function fetchAndUpdateArtistTracks(artistId: string, spotifyId: string, artistName: string): Promise<void> {
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
