export interface Artist {
  id: string;
  name: string;
  ticketmaster_id: string | null;
  spotify_id: string | null;
  image_url: string | null;
  spotify_url: string | null;
  genres: string[] | null;
  popularity: number | null;
  followers: number | null;
  sync_status: {
    ticketmaster: 'pending' | 'completed' | 'failed';
    spotify: 'pending' | 'completed' | 'failed';
  };
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Show {
  id: string;
  artist_id: string;
  date: string;
  venue: {
    id: string;
    name: string;
    city: string;
    state: string;
    country: string;
    ticketmaster_id: string | null;
  };
  city: string;
  state: string;
  country: string;
  songs: Song[];
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Song {
  id: string;
  title: string;
  duration: string;
  explicit: boolean;
  preview_url: string | null;
  spotify_id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Setlist {
  id: string;
  artist_id: string;
  show_id: string;
  song_order: number | null;
  songs: Song[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
