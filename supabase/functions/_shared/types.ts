// Types shared between Edge Functions and potentially the frontend

export interface ConcertData {
  id: string;
  date: string;
  venue: string;
  setlist: Array<{
    id: string;
    title: string;
    vote_count: number;
  }>;
  artist: {
    id: string;
    name: string;
  };
  last_updated: string;
};

export type SyncStatus = {
  ticketmaster: 'syncing' | 'success' | 'error';
  spotify: 'syncing' | 'success' | 'error';
  setlistfm: 'syncing' | 'success' | 'error';
  lastUpdated: string;
};

// Spotify API Types
export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number | null;
  preview_url: string | null;
  popularity: number | null;
  external_urls?: { spotify?: string };
  album?: {
    name?: string;
    images?: Array<{ url: string }>;
  };
}

// Database Types
export interface Database {
  public: {
    Tables: {
      setlist_songs: {
        Row: {
          id: string;
          setlist_id: string;
          song_id: string;
          name?: string;
          position: number;
          artist_id: string;
          votes: number;
          track_id?: string;
          created_at?: string;
          updated_at?: string;
          last_updated?: string;
        };
        Insert: Omit<Database['public']['Tables']['setlist_songs']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['setlist_songs']['Row']>;
      };
      user_votes: {
        Row: {
          user_id: string;
          song_id: string;
          vote_type: 'upvote' | 'downvote';
          created_at: string;
        };
        Insert: Database['public']['Tables']['user_votes']['Row'];
        Update: Partial<Database['public']['Tables']['user_votes']['Row']>;
      };
    };
  };
}

export interface Song {
  id: string;
  name: string;
  artist_id: string;
  spotify_id: string;
  spotify_url?: string;
  preview_url?: string;
  duration_ms?: number;
  popularity?: number;
  album_name?: string;
  album_image?: string;
}

export interface Artist {
  id: string;
  name: string;
  ticketmaster_id?: string;
  spotify_id?: string;
  setlist_fm_id?: string;
  image_url?: string;
  url?: string;
  genres?: string[];
  popularity?: number;
  followers?: number;
  stored_tracks?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  state?: string;
  country?: string;
  address?: string;
  postal_code?: string;
  latitude?: string;
  longitude?: string;
  image_url?: string;
  url?: string;
  ticketmaster_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Show {
  id: string;
  name: string;
  artist_id: string;
  venue_id: string;
  ticketmaster_id?: string;
  date: string;
  status?: string;
  url?: string;
  image_url?: string;
  ticket_url?: string;
  popularity?: number;
  venue?: Partial<Venue>;
  artist?: Partial<Artist>;
  created_at?: string;
  updated_at?: string;
  last_updated?: string;
}

export interface Setlist {
  id: string;
  artist_id: string;
  show_id?: string;
  venue_id?: string;
  setlist_fm_id: string;
  tour_name?: string;
  date?: string;
  songs: any[];
  created_at?: string;
  updated_at?: string;
}

export interface SetlistSong {
  id?: string;
  setlist_id: string;
  song_id: string;
  name?: string;
  position: number;
  artist_id: string;
  vote_count?: number;
  track_id?: string;
  is_encore?: boolean;
  info?: string | null;
  created_at?: string;
  updated_at?: string;
  last_updated?: string;
}

export interface Vote {
  id: string;
  song_id: string;
  user_id: string;
  count: number;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Type for the response structure of Spotify track fetching
export interface SpotifyTracksResponse {
  tracks: SpotifyTrack[];
}

// Type for Spotify artist object (simplified)
export interface SpotifyArtist {
  id: string;
  name: string;
  external_urls?: {
    spotify?: string;
  };
  followers?: {
    total: number;
  };
  genres?: string[];
  popularity?: number;
}

// Type for Ticketmaster Image object
export interface TicketmasterImage {
  url: string;
  ratio?: string;
  width?: number;
  height?: number;
  fallback?: boolean;
}

// Type for the raw event object from Ticketmaster API response
export interface TicketmasterEvent {
  id: string;
  name: string;
  url?: string;
  dates?: {
    start?: {
      dateTime?: string;
      localDate?: string;
      localTime?: string;
    };
    timezone?: string;
    status?: {
      code?: string;
    };
  };
  images?: TicketmasterImage[];
  _embedded?: {
    venues?: Array<{
      id: string;
      name: string;
      city?: { name: string };
      state?: { name: string };
      country?: { name: string; countryCode?: string };
      address?: { line1?: string };
      postalCode?: string;
      location?: { latitude?: string; longitude?: string };
      url?: string;
      images?: TicketmasterImage[];
    }>;
    attractions?: Array<{
      id: string;
      name: string;
      images?: TicketmasterImage[];
    }>;
  };
}

// Deno Types
declare global {
  interface Window {
    Deno: {
      env: {
        get(key: string): string | undefined;
      };
    };
  }
}

// Make Deno available in the global scope
declare const Deno: Window['Deno'];

// Setlist.fm Types
export interface SetlistFmResponse {
  setlist: SetlistFmSetlist[];
  total?: number;
  page?: number;
  itemsPerPage?: number;
}

export interface SetlistFmSetlist {
  id: string;
  eventDate: string;
  artist: {
    mbid?: string;
    name: string;
  };
  venue: {
    name: string;
    city: {
      name: string;
      country: {
        name: string;
      };
    };
  };
  sets: {
    set: Array<{
      encore?: boolean;
      song: Array<{
        name: string;
        info?: string;
      }>;
    }>;
  };
}

export { Deno };
