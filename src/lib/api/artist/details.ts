
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callTicketmasterApi } from "../ticketmaster-config";
import { saveArtistToDatabase } from "../database-utils";
import { searchArtistsWithEvents } from "./search";
import { getArtistByName, getArtistAllTracks } from "@/lib/spotify";

/**
 * Fetch artist details by ID
 */
export async function fetchArtistById(artistId: string): Promise<any> {
  try {
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
      return artist;
    }
    
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
          genres: []
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
        
        // Save to database
        await saveArtistToDatabase(artistData);
        
        return artistData;
      } catch (fetchError) {
        console.error("Error fetching artist by ID:", fetchError);
        // Fall back to keyword search
      }
    }
    
    // For tm- prefixed IDs or if attraction endpoint failed, extract name and search
    const searchTerm = artistId.startsWith('tm-') 
      ? decodeURIComponent(artistId.replace('tm-', '')).replace(/-/g, ' ')
      : artistId;
    
    // Search for artist by name
    const artists = await searchArtistsWithEvents(searchTerm, 1);
    
    if (artists.length > 0) {
      // Try to enrich with Spotify data
      try {
        const spotifyArtist = await getArtistByName(artists[0].name);
        if (spotifyArtist && spotifyArtist.id) {
          console.log(`Found Spotify ID ${spotifyArtist.id} for artist ${artists[0].name}`);
          artists[0].spotify_id = spotifyArtist.id;
          
          // Fetch and add tracks to the artist
          const tracks = await getArtistAllTracks(spotifyArtist.id);
          if (tracks && tracks.tracks && tracks.tracks.length > 0) {
            console.log(`Found ${tracks.tracks.length} tracks for artist ${artists[0].name}`);
            artists[0].stored_tracks = tracks.tracks;
            
            // Save the enriched artist data to the database
            await saveArtistToDatabase(artists[0]);
          }
        }
      } catch (spotifyError) {
        console.error(`Error fetching Spotify details for ${artists[0].name}:`, spotifyError);
      }
      
      return artists[0];
    }
    
    throw new Error("Artist not found");
  } catch (error) {
    console.error("Error in fetchArtistById:", error);
    toast.error("Failed to load artist details");
    throw error;
  }
}
