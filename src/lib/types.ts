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

export type Artist = {
  id: string;
  name: string;
  spotify_id?: string;
  setlist_fm_mbid?: string;
  image_url?: string;
  images?: Array<{ url: string; height?: number; width?: number }>;
  genres?: string[];
  spotify_url?: string;
  popularity?: number;
  followers?: number;
  last_updated?: string;
};

export type Venue = {
  id: string;
  name: string;
  ticketmaster_id?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  postal_code?: string;
  image_url?: string;
  updated_at?: string;
  last_updated?: string;
};

export type Show = {
  id: string;
  name?: string;
  date?: string;
  image_url?: string;
  ticket_url?: string;
  popularity?: number;
  artist_id?: string;
  venue_id?: string;
  ticketmaster_id?: string;
  artist?: {
    id: string;
    name: string;
    image_url?: string;
    genres?: string[];
  };
  venue?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    country?: string;
  };
  last_updated?: string;
};

export type Setlist = {
  id: string;
  show_id: string;
  artist_id: string;
  created_at: string;
  updated_at: string;
};

export type Song = {
  id: string;
  title: string;
  artist_id: string;
  setlist_id: string;
  vote_count: number;
  spotify_id?: string;
  last_updated?: string;
};

export type Vote = {
  id: string;
  song_id: string;
  user_id: string;
  count: number;
  created_at: string;
  updated_at: string;
};