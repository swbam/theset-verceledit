export type ConcertData = {
  id: string;
  date: string | null;
  name: string;
  status?: string;
  ticketUrl?: string;
  venue: {
    id: string;
    name: string;
    city: string | null;
  } | null;
  artist: {
    id: string;
    name: string;
  } | null;
  setlist: Array<{
    id: string;
    title: string;
    vote_count: number;
  }>;
  last_updated?: string;
};

export type SyncStatus = {
  ticketmaster: 'syncing' | 'success' | 'error';
  spotify: 'syncing' | 'success' | 'error';
  setlistfm: 'syncing' | 'success' | 'error';
  lastUpdated: string;
};

export interface Artist {
  id: string; // UUID - Make required based on DB schema
  external_id?: string; // Ticketmaster/Setlist.fm ID
  name: string;
  image_url?: string | null;
  url?: string | null;
  spotify_id?: string | null;
  spotify_url?: string | null;
  setlist_fm_mbid?: string | null;
  genres?: string[] | null;
  popularity?: number | null;
  followers?: number | null; // Added based on usage in getArtist.ts
  ticketmaster_id?: string | null; // Add Ticketmaster ID field
  created_at?: string;
  updated_at?: string;
}

export interface Venue {
  id: string; // UUID - Make required based on DB schema
  external_id?: string; // Ticketmaster/Setlist.fm ID
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  url?: string | null;
  image_url?: string | null;
  ticketmaster_id?: string | null; // Add Ticketmaster ID field
  created_at?: string;
  updated_at?: string;
}

export interface Show {
  id: string; // UUID - Make required based on DB schema
  external_id?: string; // Ticketmaster/Setlist.fm ID
  name: string;
  date?: string | null;
  artist_id?: string | null;
  artist_external_id?: string | null;
  venue_id?: string | null; // Internal UUID
  venue_external_id?: string | null;
  ticketmaster_id?: string | null; // Add Ticketmaster ID field
  setlist_id?: string | null; // Internal UUID
  setlist_external_id?: string | null; // Setlist.fm ID
  status?: string;
  url?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  ticket_url?: string | null; // Added based on DB schema
  popularity?: number | null; // Added based on DB schema
  last_updated?: string | null; // Added based on DB schema
  // Add optional nested objects for joined data
  artist?: { id: string; name: string } | null;
  venue?: { id: string; name: string; city: string | null; state: string | null } | null;
}

export interface Setlist {
  id?: string; // UUID
  external_id?: string; // Generic external ID (deprecate?)
  setlist_fm_id?: string | null; // Add specific Setlist.fm ID field
  artist_id?: string | null; // Internal UUID
  artist_external_id?: string | null; // MBID
  show_id?: string | null; // Internal UUID
  show_external_id?: string | null; // Potentially TM ID if linked?
  songs?: Partial<Song>[] | null; // Use Partial<Song> for better type safety
  tour_name?: string | null;
  venue_name?: string | null;
  city?: string | null;
  country?: string | null;
  date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Song {
  id: string; // UUID - Make required based on DB schema
  // external_id?: string; // Removed - No direct column match
  name: string;
  artist_id?: string | null;
  // artist_external_id?: string | null; // Removed - No direct column match
  spotify_id?: string | null;
  // spotify_url?: string | null; // Removed - Not in DB table
  preview_url?: string | null;
  duration_ms?: number | null;
  popularity?: number | null;
  album_name?: string | null;
  album_image_url?: string | null; // Corrected based on live DB schema
  // encore?: number | null; // Removed - Belongs to played_setlist_songs context
  // position?: number | null; // Removed - Belongs to played_setlist_songs context
  vote_count?: number | null; // Add vote_count from DB schema
  created_at?: string | null; // Allow null from DB
  updated_at?: string | null; // Allow null from DB
}

export type Vote = {
  id: string;
  song_id: string;
  user_id: string | null; // Align with DB nullability
  count: number | null; // Align with DB nullability
  created_at: string | null; // Align with DB nullability
  updated_at: string | null; // Align with DB nullability
  show_id: string; // Add missing required field from DB
};
