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
  id: string;
  name: string;
  image_url?: string | null;
  url?: string | null;
  spotify_id?: string | null;
  spotify_url?: string | null;
  setlist_fm_mbid?: string | null;
  genres?: string[] | null;
  popularity?: number | null;
  followers?: number | null;
  ticketmaster_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Venue {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  image_url?: string | null;
  url?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  postal_code?: string | null;
  ticketmaster_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Show {
  id: string;
  name: string;
  date?: string | null;
  image_url?: string | null;
  ticket_url?: string | null;
  url?: string | null;
  status?: string | null;
  popularity?: number | null;
  artist_id?: string | null;
  venue_id?: string | null;
  ticketmaster_id: string;
  artist?: Artist | null;
  venue?: Venue | null;
  created_at?: string;
  updated_at?: string;
}

export interface SetlistSong {
  id: string;
  setlist_id: string;
  song_id: string;
  name: string;
  position: number;
  artist_id?: string | null;
  votes?: number;
  vote_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Setlist {
  id: string;
  show_id: string;
  artist_id: string;
  date?: string | null;
  songs?: SetlistSong[];
  created_at?: string;
  updated_at?: string;
}

export interface Song {
  id: string; 
  name: string;
  artist_id?: string | null;
  spotify_id?: string | null;
  preview_url?: string | null;
  duration_ms?: number | null;
  popularity?: number | null;
  album_name?: string | null;
  album_image_url?: string | null; 
  vote_count?: number | null; 
  created_at?: string | null; 
  updated_at?: string | null; 
}

export type Vote = {
  id: string;
  song_id: string;
  user_id: string | null; 
  count: number | null; 
  created_at: string | null; 
  updated_at: string | null; 
  show_id: string; 
};
