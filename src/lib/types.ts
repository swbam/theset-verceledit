export type ConcertData = {
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

export interface Artist {
  id?: string; // UUID
  external_id?: string; // Ticketmaster/Setlist.fm ID
  name: string;
  image_url?: string | null;
  url?: string | null;
  spotify_id?: string | null;
  spotify_url?: string | null;
  setlist_fm_mbid?: string | null;
  genres?: string[] | null;
  popularity?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Venue {
  id?: string; // UUID
  external_id?: string; // Ticketmaster/Setlist.fm ID
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  url?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Show {
  id?: string; // UUID
  external_id?: string; // Ticketmaster/Setlist.fm ID
  name: string;
  date?: string | null;
  artist_id?: string | null;
  artist_external_id?: string | null;
  venue_id?: string | null;
  venue_external_id?: string | null;
  setlist_id?: string | null;
  setlist_external_id?: string | null;
  status?: string;
  url?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Setlist {
  id?: string; // UUID
  external_id?: string; // Setlist.fm ID
  artist_id?: string | null;
  artist_external_id?: string | null;
  show_id?: string | null;
  show_external_id?: string | null;
  songs?: any[] | null;
  tour_name?: string | null;
  venue_name?: string | null;
  city?: string | null;
  country?: string | null;
  date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Song {
  id?: string; // UUID
  external_id?: string; // Spotify or custom ID
  name: string;
  artist_id?: string | null;
  artist_external_id?: string | null;
  spotify_id?: string | null;
  spotify_url?: string | null;
  preview_url?: string | null;
  duration_ms?: number | null;
  popularity?: number | null;
  album_name?: string | null;
  album_image?: string | null;
  encore?: number | null;
  position?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type Vote = {
  id: string;
  song_id: string;
  user_id: string;
  count: number;
  created_at: string;
  updated_at: string;
};