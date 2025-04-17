export interface Database {
  setlist_songs: {
    Row: {
      id: string;
      setlist_id: string;
      name: string;
      position: number;
      artist_id: string;
      votes: number;
      created_at: string;
    }
    Insert: {
      id?: string;
      setlist_id: string;
      name: string;
      position: number;
      artist_id: string;
      votes?: number;
      created_at?: string;
    }
    Update: {
      id?: string;
      setlist_id?: string;
      name?: string;
      position?: number;
      artist_id?: string;
      votes?: number;
      created_at?: string;
    }
    Relationships: [
      // ... existing code ...
    ]
  }
} 