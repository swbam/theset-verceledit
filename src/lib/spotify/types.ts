
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
    id?: string; // Include album ID if available
    name: string;
    images?: { url: string; height?: number; width?: number }[];
  };
  votes?: number;
}

export interface SpotifyTracksResponse {
  tracks: SpotifyTrack[];
}


export interface SpotifyArtist {
  id: string;
  name: string;
  external_urls?: {
    spotify?: string;
  };
  popularity?: number;
  followers?: {
    href: string | null; // Spotify API includes href, often null
    total?: number;
  };
  images?: {
    url: string;
    height: number | null;
    width: number | null;
  }[];
  genres?: string[];
  href?: string;
  type?: 'artist';
  uri?: string;
}
