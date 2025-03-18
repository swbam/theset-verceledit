export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      artist_songs: {
        Row: {
          album_id: string | null
          album_image_url: string | null
          album_name: string | null
          artist_id: string
          duration_ms: number | null
          explicit: boolean | null
          id: string
          is_top_track: boolean | null
          last_updated: string | null
          name: string
          popularity: number | null
          preview_url: string | null
          release_date: string | null
          spotify_url: string | null
          track_number: number | null
        }
        Insert: {
          album_id?: string | null
          album_image_url?: string | null
          album_name?: string | null
          artist_id: string
          duration_ms?: number | null
          explicit?: boolean | null
          id: string
          is_top_track?: boolean | null
          last_updated?: string | null
          name: string
          popularity?: number | null
          preview_url?: string | null
          release_date?: string | null
          spotify_url?: string | null
          track_number?: number | null
        }
        Update: {
          album_id?: string | null
          album_image_url?: string | null
          album_name?: string | null
          artist_id?: string
          duration_ms?: number | null
          explicit?: boolean | null
          id?: string
          is_top_track?: boolean | null
          last_updated?: string | null
          name?: string
          popularity?: number | null
          preview_url?: string | null
          release_date?: string | null
          spotify_url?: string | null
          track_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_songs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          created_at: string | null
          followers: number | null
          genres: string[] | null
          id: string
          image_url: string | null
          name: string
          popularity: number | null
          spotify_id: string | null
          spotify_url: string | null
          stored_tracks: Json | null
          tracks_last_updated: string | null
          upcoming_shows: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          followers?: number | null
          genres?: string[] | null
          id: string
          image_url?: string | null
          name: string
          popularity?: number | null
          spotify_id?: string | null
          spotify_url?: string | null
          stored_tracks?: Json | null
          tracks_last_updated?: string | null
          upcoming_shows?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          followers?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          name?: string
          popularity?: number | null
          spotify_id?: string | null
          spotify_url?: string | null
          stored_tracks?: Json | null
          tracks_last_updated?: string | null
          upcoming_shows?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_features: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          order_index: number | null
          reference_id: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          order_index?: number | null
          reference_id: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          order_index?: number | null
          reference_id?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      job_logs: {
        Row: {
          completed_at: string | null
          data: Json | null
          id: string
          job_name: string
          message: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          data?: Json | null
          id?: string
          job_name: string
          message?: string | null
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          data?: Json | null
          id?: string
          job_name?: string
          message?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      past_setlists: {
        Row: {
          artist_id: string
          created_at: string | null
          event_date: string
          id: string
          setlist_data: Json
          setlist_id: string
          show_id: string | null
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          event_date: string
          id?: string
          setlist_data: Json
          setlist_id: string
          show_id?: string | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          event_date?: string
          id?: string
          setlist_data?: Json
          setlist_id?: string
          show_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "past_setlists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "past_setlists_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          provider: string | null
          provider_id: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          provider?: string | null
          provider_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          provider?: string | null
          provider_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      setlist_songs: {
        Row: {
          created_at: string | null
          id: string
          setlist_id: string
          suggested_by: string | null
          track_id: string
          votes: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setlist_id: string
          suggested_by?: string | null
          track_id: string
          votes?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setlist_id?: string
          suggested_by?: string | null
          track_id?: string
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "setlist_songs_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_songs_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_songs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "top_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      setlists: {
        Row: {
          created_at: string | null
          id: string
          last_updated: string | null
          show_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          show_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlists_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          artist_id: string | null
          created_at: string | null
          date: string | null
          genre_ids: string[] | null
          id: string
          image_url: string | null
          name: string
          popularity: number | null
          ticket_url: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          genre_ids?: string[] | null
          id: string
          image_url?: string | null
          name: string
          popularity?: number | null
          ticket_url?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          genre_ids?: string[] | null
          id?: string
          image_url?: string | null
          name?: string
          popularity?: number | null
          ticket_url?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shows_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shows_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      top_tracks: {
        Row: {
          album_image_url: string | null
          album_name: string | null
          artist_id: string
          duration_ms: number | null
          id: string
          last_updated: string | null
          name: string
          popularity: number | null
          preview_url: string | null
          spotify_url: string | null
        }
        Insert: {
          album_image_url?: string | null
          album_name?: string | null
          artist_id: string
          duration_ms?: number | null
          id: string
          last_updated?: string | null
          name: string
          popularity?: number | null
          preview_url?: string | null
          spotify_url?: string | null
        }
        Update: {
          album_image_url?: string | null
          album_name?: string | null
          artist_id?: string
          duration_ms?: number | null
          id?: string
          last_updated?: string | null
          name?: string
          popularity?: number | null
          preview_url?: string | null
          spotify_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "top_tracks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          location: Json | null
          name: string
          postal_code: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id: string
          location?: Json | null
          name: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          location?: Json | null
          name?: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string | null
          id: string
          setlist_song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          setlist_song_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          setlist_song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_setlist_song_id_fkey"
            columns: ["setlist_song_id"]
            isOneToOne: false
            referencedRelation: "setlist_songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_votes: {
        Args: {
          song_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
