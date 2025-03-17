
/**
 * Common types for realtime functionality
 */
export interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
  albumName?: string;
  albumImageUrl?: string;
  artistName?: string;
  setlistSongId?: string;
}

export interface Track {
  id: string;
  name: string;
  album?: {
    name?: string;
    images?: { url: string }[];
  };
  artists?: { name: string }[];
  popularity?: number;
}

export interface SetlistData {
  setlist: Song[];
  isConnected: boolean;
  isLoadingSetlist: boolean;
  setlistError: Error | null;
  setlistId: string | null;
}
