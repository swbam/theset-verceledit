import { supabase } from '@/integrations/supabase/client';
import { Artist, Show, Track } from '@/lib/types';
import { saveShow } from '@/lib/api/database/shows';

interface SyncResult {
  success: boolean;
  message: string;
  data?: any;
}

export class UnifiedSyncService {
  private static instance: UnifiedSyncService;

  private constructor() {}

  public static getInstance(): UnifiedSyncService {
    if (!UnifiedSyncService.instance) {
      UnifiedSyncService.instance = new UnifiedSyncService();
    }
    return UnifiedSyncService.instance;
  }

  async syncArtist(artistId: string): Promise<SyncResult> {
    try {
      const { data: artist, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();

      if (error) throw error;
      if (!artist) throw new Error('Artist not found');

      // Sync with Spotify
      if (artist.spotify_id) {
        const spotifyData = await this.fetchSpotifyArtistData(artist.spotify_id);
        await this.updateArtistWithSpotifyData(artist.id, spotifyData);
      }

      return { success: true, message: 'Artist sync completed', data: artist };
    } catch (error) {
      console.error('Artist sync failed:', error);
      return { success: false, message: `Artist sync failed: ${error.message}` };
    }
  }

  async syncShow(showId: string): Promise<SyncResult> {
    try {
      const { data: show, error } = await supabase
        .from('shows')
        .select('*, artist:artists(*)')
        .eq('id', showId)
        .single();

      if (error) throw error;
      if (!show) throw new Error('Show not found');

      // Sync with Ticketmaster if ID exists
      if (show.ticketmaster_id) {
        const tmData = await this.fetchTicketmasterEventData(show.ticketmaster_id);
        const updatedShow = await saveShow({
          ...show,
          ...tmData,
          updated_at: new Date().toISOString()
        });
        return { success: true, message: 'Show sync completed', data: updatedShow };
      }

      return { success: true, message: 'Show sync completed (no Ticketmaster data)', data: show };
    } catch (error) {
      console.error('Show sync failed:', error);
      return { success: false, message: `Show sync failed: ${error.message}` };
    }
  }

  async syncTracks(artistId: string): Promise<SyncResult> {
    try {
      const { data: artist, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();

      if (error) throw error;
      if (!artist) throw new Error('Artist not found');

      // Sync with Setlist.fm and update stored_tracks
      const tracks = await this.fetchArtistTracks(artist.id);
      await this.updateStoredTracks(artist.id, tracks);

      return { success: true, message: 'Tracks sync completed', data: tracks };
    } catch (error) {
      console.error('Tracks sync failed:', error);
      return { success: false, message: `Tracks sync failed: ${error.message}` };
    }
  }

  private async fetchSpotifyArtistData(spotifyId: string): Promise<any> {
    // Implement Spotify API integration via the new API route
    try {
      const response = await fetch(`/api/spotify/artist/${spotifyId}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Failed to fetch Spotify artist data (${response.status}):`, errorData);
        throw new Error(`Spotify API error: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Spotify artist data:', error);
      throw new Error(`Failed to fetch Spotify artist data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchTicketmasterEventData(eventId: string): Promise<any> {
    // Implement Ticketmaster API integration via the new API route
    try {
      const response = await fetch(`/api/ticketmaster/event/${eventId}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Failed to fetch Ticketmaster event data (${response.status}):`, errorData);
        throw new Error(`Ticketmaster API error: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Ticketmaster event data:', error);
      throw new Error(`Failed to fetch Ticketmaster event data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchArtistTracks(artistId: string): Promise<Track[]> {
    // Implement Setlist.fm API integration
    throw new Error('Not implemented');
  }

  private async updateArtistWithSpotifyData(artistId: string, spotifyData: any): Promise<void> {
    await supabase
      .from('artists')
      .update(spotifyData)
      .eq('id', artistId);
  }

  private async updateStoredTracks(artistId: string, tracks: Track[]): Promise<void> {
    await supabase
      .from('artists')
      .update({ stored_tracks: tracks })
      .eq('id', artistId);
  }
}

export const syncService = UnifiedSyncService.getInstance();