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
 name: string; // Made name required
 spotify_id?: string;
 setlist_fm_mbid?: string;
 image_url?: string; // Main image URL
 images?: Array<{ url: string; height?: number; width?: number }>; // Add images array from Spotify
 genres?: string[]; // Add genres array from Spotify
 spotify_url?: string; // Added from database-utils usage
 popularity?: number; // Added from database-utils usage
 followers?: number; // Added from database-utils usage
 last_updated?: string; // Made optional to match Show type
};

// Updated Show type to match API response and UI expectations
export type Show = {
 id: string;
 name?: string; // Added name
 date?: string;
 image_url?: string; // Added image_url
 ticket_url?: string; // Added ticket_url
 popularity?: number; // Added popularity
 artist_id?: string;
 venue_id?: string; // Added venue_id
 ticketmaster_id?: string; // Added Ticketmaster ID
 artist?: { // Nested artist object - align with Artist type
   id: string;
   name: string; // Made name required to match Artist type
   image_url?: string;
   genres?: string[];
 };
 venue?: { // Changed venue from string to optional object
   id: string;
   name: string; // Made name required
   city?: string;
   state?: string;
   country?: string; // Removed duplicate country
 };
 last_updated?: string; // Made optional
 // Removed duplicate/incorrect fields like city
};

// Define Venue type based on usage
export type Venue = {
  id: string;
  name: string; // Made name required
  city?: string;
  state?: string;
  country?: string;
  address?: string; // Added address
  postal_code?: string; // Added postal_code
  image_url?: string; // Added image_url
  last_updated?: string; // Added last_updated
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