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
  ticketmaster_id?: string;
  spotify_id?: string;
  setlist_fm_id?: string;
  image_url?: string | null;
  url?: string | null;
  genres?: string[] | null;
  popularity?: number | null;
  followers?: number | null; 
  created_at?: string;
  updated_at?: string;
}

export interface Venue {
  id: string; 
  name: string;
  city: string | null;
  state?: string | null;
  country?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  url?: string | null;
  ticketmaster_id?: string | null; 
  created_at?: string;
  updated_at?: string;
}

export interface Show {
  id: string; 
  name: string;
  artist_id: string;
  venue_id: string;
  ticketmaster_id?: string | null; 
  date?: string | null;
  artist_external_id?: string | null;
  venue_external_id?: string | null;
  setlist_id?: string | null; 
  setlist_external_id?: string | null; 
  status?: string;
  url?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  ticket_url?: string | null; 
  popularity?: number | null; 
  last_updated?: string | null; 
  artist?: { id: string; name: string } | null;
  venue?: { id: string; name: string; city: string | null; state: string | null } | null;
}

export interface Setlist {
  id?: string; 
  artist_id: string;
  show_id?: string | null; 
  venue_id?: string | null; 
  setlist_fm_id: string | null; 
  artist_external_id?: string | null; 
  show_external_id?: string | null; 
  songs?: Partial<Song>[] | null; 
  tour_name?: string | null;
  venue_name?: string | null;
  city?: string | null;
  country?: string | null;
  date?: string | null;
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
