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
          id: string
          name: string
          image_url: string | null
          ticketmaster_id: string | null
          spotify_id: string | null
          created_at: string
          updated_at: string
          sync_status: Json | null
        }
        Insert: {
          id?: string
          name: string
          image_url?: string | null
          ticketmaster_id?: string | null
          spotify_id?: string | null
          created_at?: string
          updated_at?: string
          sync_status?: Json | null
        }
        Update: {
          id?: string
          name?: string
          image_url?: string | null
          ticketmaster_id?: string | null
          spotify_id?: string | null
          created_at?: string
          updated_at?: string
          sync_status?: Json | null
        }
      }
      shows: {
        Row: {
          id: string
          artist_id: string
          venue_id: string | null
          name: string | null
          date: string | null
          ticketmaster_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          artist_id: string
          venue_id?: string | null
          name?: string | null
          date?: string | null
          ticketmaster_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          artist_id?: string
          venue_id?: string | null
          name?: string | null
          date?: string | null
          ticketmaster_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      venues: {
        Row: {
          id: string
          name: string
          city: string
          state: string | null
          ticketmaster_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          city: string
          state?: string | null
          ticketmaster_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          city?: string
          state?: string | null
          ticketmaster_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
