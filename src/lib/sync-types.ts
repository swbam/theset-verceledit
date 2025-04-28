// Types for sync operations - moved from src/lib/sync/types.ts
export enum EntityType {
  Artist = 'artist',
  Venue = 'venue',
  Show = 'show',
  Song = 'song',
  Setlist = 'setlist'
}

export type SyncOperation = 'create' | 'update' | 'delete' | 'refresh';

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface SyncTask {
  id?: string;
  type: EntityType;
  operation: SyncOperation;
  priority: PriorityLevel;
  payload?: any;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyncState {
  entity_id: string;
  entity_type: EntityType;
  ticketmaster_id?: string;
  last_synced: string;
  sync_version: number;
  error?: string;
}

export interface Show {
  id: string; // Was UUID previously
  ticketmaster_id: string;
}

export interface SyncArtist {
  id: string;
  name: string;
  ticketmaster_id: string;
  tm_id: string;
  image_url?: string | null;
  url?: string | null;
  spotify_id?: string | null;
  spotify_url?: string | null;
  setlist_fm_mbid?: string | null;
  setlist_fm_id?: string | null;
  genres: string[];
  popularity?: number | null;
  followers?: number | null;
  stored_tracks?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SyncVenue {
  id: string;
  name: string;
  ticketmaster_id: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  image_url?: string;
  url?: string;
  latitude?: string;
  longitude?: string;
  postal_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyncShow {
  id: string;
  name: string;
  ticketmaster_id: string;
  date?: string;
  image_url?: string;
  ticket_url?: string;
  url?: string;
  status?: string;
  popularity?: number;
  artist_id?: string;
  venue_id?: string;
  artist?: SyncArtist;
  venue?: SyncVenue;
  created_at?: string;
  updated_at?: string;
}

export interface SyncSong {
  id: string;
  name: string;
  artist_id?: string;
  spotify_id?: string;
  spotify_url?: string;
  duration_ms?: number;
  popularity?: number;
  preview_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyncSetlistSong {
  id: string;
  setlist_id: string;
  song_id: string;
  name: string;
  position: number;
  artist_id?: string;
  votes?: number;
  vote_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SyncSetlist {
  id: string;
  show_id: string;
  artist_id: string;
  date?: string;
  songs?: SyncSetlistSong[];
  created_at?: string;
  updated_at?: string;
}

export interface SyncVote {
  id: string;
  user_id?: string;
  song_id: string;
  show_id: string;
  count: number;
  created_at?: string;
  updated_at?: string;
}