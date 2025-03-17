
import { Json } from '@/integrations/supabase/types';

// Track interface for type safety
export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms?: number;
  popularity?: number;
  preview_url?: string;
  uri?: string;
  album?: {
    name?: string;
    images?: { url: string }[];
  };
  artists?: { name: string }[];
  votes?: number;
}

export interface SpotifyTracksResponse {
  tracks: SpotifyTrack[];
}

// For Spotify API standard responses
export namespace SpotifyApi {
  export interface TrackObjectSimplified {
    id: string;
    name: string;
    duration_ms?: number;
    popularity?: number;
    preview_url?: string;
    uri?: string;
    album?: {
      name?: string;
      images?: { url: string }[];
    };
    artists?: { name: string }[];
  }
}
