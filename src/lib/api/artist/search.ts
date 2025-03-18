
import { toast } from "sonner";
import { callTicketmasterApi } from "../ticketmaster-config";
import { saveArtistToDatabase } from "../database-utils";
import { getArtistByName, getArtistAllTracks } from "@/lib/spotify";

/**
 * Search for artists with upcoming events
 */
export async function searchArtistsWithEvents(query: string, limit = 10): Promise<any[]> {
  try {
    if (!query.trim()) return [];
    
    const data = await callTicketmasterApi('events.json', {
      keyword: query,
      segmentName: 'Music',
      sort: 'date,asc',
      size: limit.toString()
    });

    if (!data._embedded?.events) {
      return [];
    }

    // Extract unique artists from events
    const artistsMap = new Map();
    
    data._embedded.events.forEach((event: any) => {
      // Get artist from attractions if available
      let artistName = '';
      let artistId = '';
      let artistImage = '';
      
      if (event._embedded?.attractions && event._embedded.attractions.length > 0) {
        const attraction = event._embedded.attractions[0];
        artistName = attraction.name;
        artistId = attraction.id;
        artistImage = attraction.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url;
      } else {
        // Fallback to extracting from event name if no attractions
        artistName = event.name.split(' at ')[0].split(' - ')[0].trim();
        artistId = `tm-${encodeURIComponent(artistName.toLowerCase().replace(/\s+/g, '-'))}`;
        artistImage = event.images.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url;
      }
      
      if (!artistsMap.has(artistId)) {
        artistsMap.set(artistId, {
          id: artistId,
          name: artistName,
          image: artistImage,
          upcomingShows: 1
        });
      } else {
        // Increment upcoming shows count for this artist
        const artist = artistsMap.get(artistId);
        artist.upcomingShows += 1;
        artistsMap.set(artistId, artist);
      }
    });
    
    // Process artists - save to database and fetch Spotify data
    const artists = Array.from(artistsMap.values());
    const enrichedArtists = [];
    
    for (const artist of artists) {
      // Try to fetch Spotify data for this artist
      try {
        const spotifyArtist = await getArtistByName(artist.name);
        if (spotifyArtist && spotifyArtist.id) {
          console.log(`Found Spotify ID ${spotifyArtist.id} for artist ${artist.name}`);
          artist.spotify_id = spotifyArtist.id;
          
          // Fetch and add tracks to the artist
          const tracks = await getArtistAllTracks(spotifyArtist.id);
          if (tracks && tracks.tracks && tracks.tracks.length > 0) {
            console.log(`Found ${tracks.tracks.length} tracks for artist ${artist.name}`);
            artist.stored_tracks = tracks.tracks;
          }
        }
      } catch (spotifyError) {
        console.error(`Error fetching Spotify details for ${artist.name}:`, spotifyError);
      }
      
      // Save to database (with or without Spotify data)
      await saveArtistToDatabase(artist);
      enrichedArtists.push(artist);
    }
    
    return enrichedArtists;
  } catch (error) {
    console.error("Ticketmaster artist search error:", error);
    toast.error("Failed to search for artists");
    return [];
  }
}
