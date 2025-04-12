import { createServiceRoleClient } from '@/integrations/supabase/utils'; // Import the new utility
import { APIClientManager } from './api-client';
import { IncrementalSyncService } from './incremental';
import { SyncOptions, SyncResult } from './types';
import { Song } from '@/lib/types';

// --- Interfaces for Spotify API Responses ---
interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

interface SpotifyAlbum {
  name?: string;
  images?: SpotifyImage[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  external_urls?: { spotify?: string };
  preview_url?: string | null;
  duration_ms?: number;
  popularity?: number;
  album?: SpotifyAlbum;
}

interface SpotifySearchResponse {
  tracks?: {
    items?: SpotifyTrack[];
  };
}

interface SpotifyTopTracksResponse {
  tracks?: SpotifyTrack[];
}
// --- End Interfaces ---


/**
 * Service for syncing song data from external APIs
 */
export class SongSyncService {
  private apiClient: APIClientManager;
  private syncService: IncrementalSyncService;
  private supabaseAdmin; // Add a property for the client instance
  
  constructor() {
    this.apiClient = new APIClientManager();
    this.syncService = new IncrementalSyncService();
    this.supabaseAdmin = createServiceRoleClient(); // Instantiate the service role client
  }
  
  /**
   * Sync a song by ID
   */
  async syncSong(songId: string, options?: SyncOptions): Promise<SyncResult<Song>> {
    try {
      // Check if we need to sync
      const syncStatus = await this.syncService.getSyncStatus(songId, 'song', options);
      
      if (!syncStatus.needsSync) {
        // Get existing song data
        const { data: song } = await this.supabaseAdmin // Use the admin client instance
          .from('songs')
          .select('*')
          .eq('id', songId)
          .single();
          
        return {
          success: true,
          updated: false,
          data: song as Song
        };
      }
      
      // We need to sync - fetch from APIs
      const song = await this.fetchSongData(songId);
      
      if (!song) {
        return {
          success: false,
          updated: false,
          error: 'Failed to fetch song data'
        };
      }
      
      // Update in database
      const { error } = await this.supabaseAdmin // Use the admin client instance
        .from('songs')
        .upsert(song, { onConflict: 'id' });
        
      if (error) {
        console.error(`Error upserting song ${songId}:`, error);
        return {
          success: false,
          updated: false,
          error: error.message
        };
      }
      
      // Mark as synced
      await this.syncService.markSynced(songId, 'song');
      
      return {
        success: true,
        updated: true,
        data: song
      };
    } catch (error) {
      console.error(`Error syncing song ${songId}:`, error);
      return {
        success: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Fetch song data from all available sources
   */
  private async fetchSongData(songId: string): Promise<Song | null> {
    // First try to get existing song
    const { data: existingSong } = await this.supabaseAdmin // Use the admin client instance
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single();
      
    let song = existingSong as Song | null;
    
    if (!song) {
      // If this is a setlist song ID (format is setlistId-setIndex-songIndex)
      // then extract from setlist
      const parts = songId.split('-');
      if (parts.length === 3) {
        const setlistId = parts[0];
        
        // Get setlist
        const { data: setlist } = await this.supabaseAdmin // Use the admin client instance
          .from('setlists')
          .select('songs, artist_id')
          .eq('id', setlistId)
          .single();
          
        if (setlist && setlist.songs && Array.isArray(setlist.songs)) {
          // Find matching song
          const foundSong = setlist.songs.find((s: Song) => s.id === songId);
          
          if (foundSong) {
            song = foundSong;
            
            // If we're missing the artist ID, use the setlist's
            if (!song.artist_id && setlist.artist_id) {
              song.artist_id = setlist.artist_id;
            }
          }
        }
      }
    }
    
    // If we've found a song, enrich it with Spotify data
    if (song && song.artist_id) { // Check if song and artist_id exist
      try {
        // Get artist info - We know song and song.artist_id are not null here due to the outer check
        const { data: artist } = await this.supabaseAdmin // Use the admin client instance
          .from('artists')
          .select('name')
          .eq('id', song.artist_id) // Accessing song.artist_id here
          .single();
          
        // Re-check song after await, just in case, to satisfy TS strict null checks
        if (!song) {
           console.warn("Song became null after fetching artist data");
           return null;
        }

        if (artist) {
          // Search for song on Spotify
          const spotifyData = await this.apiClient.callAPI(
            'spotify',
            'search',
            {
              q: `track:${song.name} artist:${artist.name}`, // Accessing song.name here
              type: 'track',
              limit: 1
            }
          ) as SpotifySearchResponse | null; // Add type assertion
          
          if (spotifyData?.tracks?.items && spotifyData.tracks.items.length > 0) { // Use optional chaining
            const track = spotifyData.tracks.items[0];
            
            // Update song with Spotify data
            song = {
              ...song,
              spotify_id: track.id,
              spotify_url: track.external_urls?.spotify || null,
              preview_url: track.preview_url || null,
              duration_ms: track.duration_ms || null,
              popularity: track.popularity || null,
              album_name: track.album?.name || null,
              album_image: track.album?.images?.[0]?.url || null,
              updated_at: new Date().toISOString()
            };
          }
        }
      } catch (error) {
        console.warn(`Error enriching song ${songId} with Spotify data:`, error);
      }
    }
    
    return song;
  }
  
  /**
   * Search for songs by artist and name
   */
  async searchSongs(artistName: string, songName?: string): Promise<Song[]> {
    try {
      const query = songName
        ? `track:${songName} artist:${artistName}`
        : `artist:${artistName}`;
        
      // Search Spotify for songs
      const spotifyData = await this.apiClient.callAPI(
        'spotify',
        'search',
        {
          q: query,
          type: 'track',
          limit: 20
        }
      ) as SpotifySearchResponse | null; // Add type assertion
      
      if (!spotifyData?.tracks?.items) { // Use optional chaining
        return [];
      }
      
      const results: Song[] = [];
      
      // Find the artist ID
      let artistId = null;
      const { data: artists } = await this.supabaseAdmin // Use the admin client instance
        .from('artists')
        .select('id')
        .ilike('name', artistName)
        .limit(1);
        
      if (artists && artists.length > 0) {
        artistId = artists[0].id;
      }
      
      // Process each track
      for (const track of spotifyData.tracks.items) { // Now TypeScript knows the shape
        if (!track.id) continue;
        
        const song: Song = {
          id: track.id,
          name: track.name,
          artist_id: artistId,
          spotify_id: track.id,
          spotify_url: track.external_urls?.spotify || null,
          preview_url: track.preview_url || null,
          duration_ms: track.duration_ms || null,
          popularity: track.popularity || null,
          album_name: track.album?.name || null,
          album_image: track.album?.images?.[0]?.url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        results.push(song);
        
        // Store each song as we find them if it has an artist_id
        if (artistId) {
          await this.supabaseAdmin // Use the admin client instance
            .from('songs')
            .upsert(song, { onConflict: 'id' });
            
          // Mark as synced
          await this.syncService.markSynced(track.id, 'song');
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error searching for songs: ${artistName}, ${songName}`, error);
      return [];
    }
  }
  
  /**
   * Get popular songs by an artist
   */
  async getArtistTopSongs(artistId: string, limit = 10): Promise<Song[]> {
    try {
      // Get artist info including Spotify ID
      const { data: artist } = await this.supabaseAdmin // Use the admin client instance
        .from('artists')
        .select('name, spotify_id')
        .eq('id', artistId)
        .single();
        
      if (!artist) {
        console.error(`Artist ${artistId} not found for top songs`);
        return [];
      }
      
      let songs: Song[] = [];
      
      // If we have a Spotify ID, get top tracks
      if (artist.spotify_id) {
        try {
          const spotifyData = await this.apiClient.callAPI(
            'spotify',
            `artists/${artist.spotify_id}/top-tracks`,
            { market: 'US' }
          ) as SpotifyTopTracksResponse | null; // Add type assertion
          
          if (spotifyData?.tracks) { // Use optional chaining
            // Process tracks
            for (const track of spotifyData.tracks) { // Now TypeScript knows the shape
              const song: Song = {
                id: track.id, // Access known property
                name: track.name,
                artist_id: artistId,
                spotify_id: track.id,
                spotify_url: track.external_urls?.spotify || null,
                preview_url: track.preview_url || null,
                duration_ms: track.duration_ms || null,
                popularity: track.popularity || null,
                album_name: track.album?.name || null,
                album_image: track.album?.images?.[0]?.url || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              songs.push(song);
              
              // Store each song
              await this.supabaseAdmin // Use the admin client instance
                .from('songs')
                .upsert(song, { onConflict: 'id' });
                
              // Mark as synced
              await this.syncService.markSynced(track.id, 'song');
            }
          }
        } catch (error) {
          console.warn(`Error getting Spotify top tracks for artist ${artistId}:`, error);
        }
      }
      
      // If we couldn't get songs from Spotify, do a general search
      if (songs.length === 0) {
        songs = await this.searchSongs(artist.name);
      }
      
      return songs.slice(0, limit);
    } catch (error) {
      console.error(`Error getting top songs for artist ${artistId}:`, error);
      return [];
    }
  }
}
