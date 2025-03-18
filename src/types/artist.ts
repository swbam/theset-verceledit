export interface Artist {
  id: string;
  name: string;
  genres?: string[];
  image?: string | null;
  ticketmasterUrl?: string | null;
  spotifyId?: string | null;
  // Add additional fields as needed
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

export interface Venue {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
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