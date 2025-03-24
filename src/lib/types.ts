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
  last_updated: string;
};

export type Show = {
  id: string;
  date: string;
  venue: string;
  city: string;
  artist_id: string;
  ticketmaster_id?: string;
  last_updated: string;
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