export interface Artist {
  id: string;
  name: string;
  image?: string;
  genres?: string[];
  spotify_id?: string;
  followers?: number;
  monthly_listeners?: number;
  popularity?: number;
}

export interface Show {
  id: string;
  date: string;
  name: string;
  venue?: Venue;
  ticket_url?: string;
  artist?: Artist;
  image_url?: string;
}

export interface Venue {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
}

export interface PastSetlist {
  id: string;
  date: string;
  venue: Venue;
  songs: string[];
  artist_id: string;
}

export interface TopTrack {
  id: string;
  name: string;
  preview_url?: string;
  spotify_url: string;
  album?: {
    name: string;
    image?: string;
  };
}

export interface ArtistTopTracks {
  tracks: TopTrack[];
}

export interface ArtistWithEvents extends Artist {
  events: Event[];
}

export interface Event {
  id: string;
  name: string;
  date: string;
  status?: string;
  url: string;
  image?: string;
  venue: Venue;
}

export interface Track {
  id: string;
  name: string;
  spotifyId?: string;
  spotifyUrl?: string;
  previewUrl?: string;
  album?: {
    name: string;
    image?: string;
  };
}

export interface SetlistItem {
  id: string;
  trackId: string;
  showId: string;
  track: Track;
  votes: number; // Count of votes
  userVoted?: boolean; // Whether the current user has voted for this track
} 