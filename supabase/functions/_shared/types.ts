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

// Define base types used across functions
export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  popularity: number;
}

export interface Song {
  id: string;
  artist_id: string;
  name: string;
  spotify_id: string;
  duration_ms: number;
  preview_url?: string | null;
  popularity?: number;
  created_at?: string;
  updated_at?: string;
  vote_count?: number;
}

export interface Artist {
  id: string;
  name: string;
  spotify_id?: string;
  image_url?: string;
  popularity?: number;
  genres?: string[];
}

export interface Venue {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface Show {
  id: string;
  name: string;
  artist_id: string;
  venue_id: string;
  date: string;
  ticketmaster_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Setlist {
  id: string; // DB generated UUID
  show_id: string; // Foreign key to shows table (using DB show ID)
  artist_id: string; // Foreign key to artists table (using DB artist ID)
  date?: string; // Copied from show
  venue?: string; // Copied from show/venue
  venue_city?: string; // Copied from show/venue
  tour_name?: string; // Optional
  setlist_fm_id?: string; // Optional
  created_at?: string; // DB timestamp
  updated_at?: string; // DB timestamp
};

// Represents an entry in the junction table
export interface SetlistSong {
    id?: string; // DB generated UUID
    setlist_id: string; // Foreign key to setlists table
    song_id: string; // Foreign key to songs table
    name?: string; // Denormalized song name
    position: number; // Order in the setlist
    artist_id: string; // Denormalized artist ID
    vote_count?: number; // Initialized to 0
    track_id?: string; // Potentially spotify_id? Check usage
    created_at?: string; // DB timestamp
    updated_at?: string; // DB timestamp
    last_updated?: string; // From DB? Check usage
};

export interface Vote {
  id: string;
  song_id: string;
  user_id: string;
  count: number;
  created_at: string;
  updated_at: string;
};

// Type for the response structure of Spotify track fetching
export type SpotifyTracksResponse = {
  tracks: SpotifyTrack[];
};

// Type for Spotify artist object (simplified)
export interface SpotifyArtist {
    id: string;
    name: string;
    external_urls: {
        spotify?: string;
    };
    popularity?: number;
    followers: {
        total?: number;
    };
    images?: Array<{ url: string; height?: number; width?: number }>;
    genres?: string[];
};

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
  popularity?: number;
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