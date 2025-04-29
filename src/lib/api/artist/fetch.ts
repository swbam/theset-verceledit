import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callTicketmasterApi } from "../ticketmaster-config";
import { getArtistByName } from "@/lib/spotify";
import { getArtistTopTracks } from "@/lib/spotify/top-tracks";
import type { Database } from "@/integrations/supabase/types";

type Artist = Database["public"]["Tables"]["artists"]["Row"];
type ArtistInsert = Database["public"]["Tables"]["artists"]["Insert"];

interface ExtendedArtist extends Artist {
  upcomingShows: number;
}

/**
 * Fetch artist details by ID with improved error handling and data sync
 */
export async function fetchArtistById(artistId: string): Promise<ExtendedArtist> {
  try {
    console.log(`Fetching artist details for ID: ${artistId}`);

    // First try to get from database
    const { data: dbArtist, error: dbError } = await supabase
      .from('artists')
      .select('*')
      .or(`id.eq.${artistId},ticketmaster_id.eq.${artistId}`)
      .single();

    if (dbArtist && !dbError) {
      const needsRefresh = !dbArtist.updated_at || 
        new Date(dbArtist.updated_at).getTime() < Date.now() - 24 * 60 * 60 * 1000;

      if (!needsRefresh) {
        return {
          ...dbArtist,
          upcomingShows: 0 // Will be populated by separate shows query
        };
      }
    }

    // Fetch from Ticketmaster
    let tmData;
    const tmId = artistId.startsWith('tm-') ? artistId.replace('tm-', '') : artistId;

    try {
      tmData = await callTicketmasterApi(`attractions/${tmId}.json`);
    } catch (tmError) {
      // If direct lookup fails, try search
      const searchData = await callTicketmasterApi('attractions.json', {
        keyword: artistId.startsWith('tm-') 
          ? decodeURIComponent(artistId.replace('tm-', '')).replace(/-/g, ' ')
          : artistId
      });
      
      if (searchData._embedded?.attractions?.length > 0) {
        tmData = searchData._embedded.attractions[0];
      } else {
        throw new Error("Artist not found in Ticketmaster");
      }
    }

    if (!tmData) {
      throw new Error("Failed to fetch artist data from Ticketmaster");
    }

    // Build artist data object
    const artistData: ArtistInsert = {
      name: tmData.name,
      image_url: tmData.images?.find((img: any) => img.ratio === "16_9" && img.width > 500)?.url || null,
      genres: [],
      ticketmaster_id: tmData.id,
      url: tmData.url || null,
      spotify_id: null,
      spotify_url: null,
      followers: null,
      popularity: null,
      stored_tracks: null,
      setlist_fm_id: null,
      setlist_fm_mbid: null
    };

    // Add genres
    if (tmData.classifications?.length > 0) {
      const classification = tmData.classifications[0];
      const genres: string[] = [];
      if (classification.genre?.name) {
        genres.push(classification.genre.name);
      }
      if (classification.subGenre?.name) {
        genres.push(classification.subGenre.name);
      }
      artistData.genres = genres;
    }

    // Get Spotify data
    try {
      const spotifyArtist = await getArtistByName(artistData.name);
      if (spotifyArtist?.id) {
        artistData.spotify_id = spotifyArtist.id;
        artistData.spotify_url = spotifyArtist.external_urls?.spotify || null;
        artistData.popularity = spotifyArtist.popularity || null;
        artistData.followers = spotifyArtist.followers?.total || null;

        // Get and store tracks
        const { tracks } = await getArtistTopTracks(spotifyArtist.id);
        if (tracks?.length > 0) {
          artistData.stored_tracks = tracks.map(track => ({
            id: track.id,
            name: track.name,
            duration_ms: track.duration_ms,
            popularity: track.popularity,
            preview_url: track.preview_url
          }));
        }
      }
    } catch (spotifyError) {
      console.error(`Error fetching Spotify details for ${artistData.name}:`, spotifyError);
    }

    // Update or insert into database
    const { data: upsertedArtist, error: upsertError } = await supabase
      .from('artists')
      .upsert(artistData)
      .select()
      .single();

    if (upsertError) {
      console.error("Error upserting artist data:", upsertError);
      toast.error("Error saving artist data");
      throw upsertError;
    }

    if (!upsertedArtist) {
      throw new Error("Failed to upsert artist data");
    }

    return {
      ...upsertedArtist,
      upcomingShows: 0 // Will be populated by separate shows query
    };

  } catch (error) {
    console.error("Error in fetchArtistById:", error);
    throw error;
  }
}
