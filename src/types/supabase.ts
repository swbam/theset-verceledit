export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      artists: {
        Row: {
          created_at: string | null
          external_id: string | null
          followers: number | null
          genres: string[] | null
          id: string
          image_url: string | null
          name: string
          popularity: number | null
          setlist_fm_id: string | null
          setlist_fm_mbid: string | null
          spotify_id: string | null
          spotify_url: string | null
          stored_tracks: Json | null
          ticketmaster_id: string | null
          tm_id: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          external_id?: string | null
          followers?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          name: string
          popularity?: number | null
          setlist_fm_id?: string | null
          setlist_fm_mbid?: string | null
          spotify_id?: string | null
          spotify_url?: string | null
          stored_tracks?: Json | null
          ticketmaster_id?: string | null
          tm_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          external_id?: string | null
          followers?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          name?: string
          popularity?: number | null
          setlist_fm_id?: string | null
          setlist_fm_mbid?: string | null
          spotify_id?: string | null
          spotify_url?: string | null
          stored_tracks?: Json | null
          ticketmaster_id?: string | null
          tm_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
      }
      setlist_songs: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          order_index: number | null
          position: number | null
          setlist_id: string | null
          song_id: string | null
          spotify_id: string | null
          updated_at: string | null
          votes: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          order_index?: number | null
          position?: number | null
          setlist_id?: string | null
          song_id?: string | null
          spotify_id?: string | null
          updated_at?: string | null
          votes?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          order_index?: number | null
          position?: number | null
          setlist_id?: string | null
          song_id?: string | null
          spotify_id?: string | null
          updated_at?: string | null
          votes?: number | null
        }
      }
      shows: {
        Row: {
          artist_id: string | null
          created_at: string | null
          date: string | null
          external_id: string | null
          id: string
          image_url: string | null
          last_updated: string | null
          name: string
          ticket_url: string | null
          ticketmaster_id: string | null
          tm_id: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          last_updated?: string | null
          name: string
          ticket_url?: string | null
          ticketmaster_id?: string | null
          tm_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          last_updated?: string | null
          name?: string
          ticket_url?: string | null
          ticketmaster_id?: string | null
          tm_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
      }
      sync_states: {
        Row: {
          entity_id: string
          entity_type: string
          external_id: string | null
          last_synced: string
          sync_version: number | null
        }
        Insert: {
          entity_id: string
          entity_type: string
          external_id?: string | null
          last_synced: string
          sync_version?: number | null
        }
        Update: {
          entity_id?: string
          entity_type?: string
          external_id?: string | null
          last_synced?: string
          sync_version?: number | null
        }
      }
      venues: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          external_id: string | null
          id: string
          image_url: string | null
          latitude: string | null
          longitude: string | null
          name: string
          postal_code: string | null
          state: string | null
          ticketmaster_id: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: string | null
          longitude?: string | null
          name: string
          postal_code?: string | null
          state?: string | null
          ticketmaster_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: string | null
          longitude?: string | null
          name?: string
          postal_code?: string | null
          state?: string | null
          ticketmaster_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type TablesRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
