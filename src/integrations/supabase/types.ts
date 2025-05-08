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
      admins: {
        Row: {
          created_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          data: Json
          entity_id: string | null
          entity_type: string | null
          expires_at: string
          provider: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          data: Json
          entity_id?: string | null
          entity_type?: string | null
          expires_at: string
          provider?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          data?: Json
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string
          provider?: string | null
        }
        Relationships: []
      }
      artists: {
        Row: {
          created_at: string | null
          followers: number | null
          genres: string[] | null
          id: string
          image_url: string | null
          last_spotify_sync: string | null
          last_sync: string | null
          last_sync_error: string | null
          last_ticketmaster_sync: string | null
          name: string
          popularity: number | null
          setlist_fm_id: string | null
          setlist_fm_mbid: string | null
          spotify_id: string | null
          spotify_popularity: number | null
          spotify_url: string | null
          stored_songs: Json | null
          stored_tracks: Json | null
          sync_status: Json | null
          ticketmaster_id: string
          upcoming_shows_count: number | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          followers?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          last_spotify_sync?: string | null
          last_sync?: string | null
          last_sync_error?: string | null
          last_ticketmaster_sync?: string | null
          name: string
          popularity?: number | null
          setlist_fm_id?: string | null
          setlist_fm_mbid?: string | null
          spotify_id?: string | null
          spotify_popularity?: number | null
          spotify_url?: string | null
          stored_songs?: Json | null
          stored_tracks?: Json | null
          sync_status?: Json | null
          ticketmaster_id: string
          upcoming_shows_count?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          followers?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          last_spotify_sync?: string | null
          last_sync?: string | null
          last_sync_error?: string | null
          last_ticketmaster_sync?: string | null
          name?: string
          popularity?: number | null
          setlist_fm_id?: string | null
          setlist_fm_mbid?: string | null
          spotify_id?: string | null
          spotify_popularity?: number | null
          spotify_url?: string | null
          stored_songs?: Json | null
          stored_tracks?: Json | null
          sync_status?: Json | null
          ticketmaster_id?: string
          upcoming_shows_count?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          endpoint: string
          error: string
          id: string
          timestamp: string | null
        }
        Insert: {
          endpoint: string
          error: string
          id?: string
          timestamp?: string | null
        }
        Update: {
          endpoint?: string
          error?: string
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          id: number
          name: string | null
          sql: string | null
        }
        Insert: {
          executed_at?: string | null
          id?: number
          name?: string | null
          sql?: string | null
        }
        Update: {
          executed_at?: string | null
          id?: number
          name?: string | null
          sql?: string | null
        }
        Relationships: []
      }
      played_setlist_songs: {
        Row: {
          created_at: string | null
          id: string
          info: string | null
          is_encore: boolean | null
          position: number | null
          setlist_id: string | null
          song_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          info?: string | null
          is_encore?: boolean | null
          position?: number | null
          setlist_id?: string | null
          song_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          info?: string | null
          is_encore?: boolean | null
          position?: number | null
          setlist_id?: string | null
          song_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "played_setlist_songs_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string | null
          hits: number | null
          id: string
          key: string
          reset_at: string
        }
        Insert: {
          created_at?: string | null
          hits?: number | null
          id?: string
          key: string
          reset_at: string
        }
        Update: {
          created_at?: string | null
          hits?: number | null
          id?: string
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      setlist_songs: {
        Row: {
          artist_id: string | null
          created_at: string
          id: string
          is_encore: boolean | null
          last_updated: string | null
          name: string | null
          played: boolean | null
          position: number
          setlist_id: string
          song_id: string | null
          updated_at: string
          vote_count: number | null
          votes: number | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          id?: string
          is_encore?: boolean | null
          last_updated?: string | null
          name?: string | null
          played?: boolean | null
          position: number
          setlist_id: string
          song_id?: string | null
          updated_at?: string
          vote_count?: number | null
          votes?: number | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          id?: string
          is_encore?: boolean | null
          last_updated?: string | null
          name?: string | null
          played?: boolean | null
          position?: number
          setlist_id?: string
          song_id?: string | null
          updated_at?: string
          vote_count?: number | null
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "setlist_songs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_songs_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      setlists: {
        Row: {
          artist_id: string | null
          created_at: string | null
          date: string | null
          id: string
          setlist_fm_id: string | null
          show_id: string | null
          songs: Json | null
          status: string | null
          tour_name: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          setlist_fm_id?: string | null
          show_id?: string | null
          songs?: Json | null
          status?: string | null
          tour_name?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          setlist_fm_id?: string | null
          show_id?: string | null
          songs?: Json | null
          status?: string | null
          tour_name?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setlists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlists_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlists_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          artist_id: string | null
          created_at: string | null
          date: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          last_sync: string | null
          last_sync_error: string | null
          last_updated: string | null
          max_price: number | null
          min_price: number | null
          name: string
          popularity: number | null
          setlist_suggestions: Json | null
          status: string | null
          sync_status: string | null
          ticket_url: string | null
          ticketmaster_id: string | null
          total_votes: number | null
          updated_at: string | null
          url: string | null
          venue_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          last_sync?: string | null
          last_sync_error?: string | null
          last_updated?: string | null
          max_price?: number | null
          min_price?: number | null
          name: string
          popularity?: number | null
          setlist_suggestions?: Json | null
          status?: string | null
          sync_status?: string | null
          ticket_url?: string | null
          ticketmaster_id?: string | null
          total_votes?: number | null
          updated_at?: string | null
          url?: string | null
          venue_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          last_sync?: string | null
          last_sync_error?: string | null
          last_updated?: string | null
          max_price?: number | null
          min_price?: number | null
          name?: string
          popularity?: number | null
          setlist_suggestions?: Json | null
          status?: string | null
          sync_status?: string | null
          ticket_url?: string | null
          ticketmaster_id?: string | null
          total_votes?: number | null
          updated_at?: string | null
          url?: string | null
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
      songs: {
        Row: {
          album_image_url: string | null
          album_name: string | null
          artist_id: string | null
          created_at: string | null
          duration_ms: number | null
          id: string
          name: string
          popularity: number | null
          preview_url: string | null
          setlist_fm_id: string | null
          spotify_id: string | null
          updated_at: string | null
          vote_count: number | null
        }
        Insert: {
          album_image_url?: string | null
          album_name?: string | null
          artist_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          name: string
          popularity?: number | null
          preview_url?: string | null
          setlist_fm_id?: string | null
          spotify_id?: string | null
          updated_at?: string | null
          vote_count?: number | null
        }
        Update: {
          album_image_url?: string | null
          album_name?: string | null
          artist_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          name?: string
          popularity?: number | null
          preview_url?: string | null
          setlist_fm_id?: string | null
          spotify_id?: string | null
          updated_at?: string | null
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "songs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string
          error_message: string | null
          external_service: string | null
          id: number
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          external_service?: string | null
          id?: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          external_service?: string | null
          id?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_states: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          last_sync_at: string | null
          metadata: Json | null
          next_sync_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          next_sync_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          next_sync_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          data: Json | null
          dependencies: string[] | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          error: string | null
          id: string
          priority: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          dependencies?: string[] | null
          entity_id: string
          entity_name?: string | null
          entity_type: string
          error?: string | null
          id?: string
          priority?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          dependencies?: string[] | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          error?: string | null
          id?: string
          priority?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trending_shows_cache: {
        Row: {
          cached_at: string
          rank: number
          show_id: string
        }
        Insert: {
          cached_at?: string
          rank?: number
          show_id: string
        }
        Update: {
          cached_at?: string
          rank?: number
          show_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          artist_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_votes: {
        Row: {
          created_at: string | null
          id: string
          song_id: string
          updated_at: string | null
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          song_id: string
          updated_at?: string | null
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          song_id?: string
          updated_at?: string | null
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_votes_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "setlist_songs"
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
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          postal_code: string | null
          state: string | null
          ticketmaster_id: string | null
          timezone: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          postal_code?: string | null
          state?: string | null
          ticketmaster_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          postal_code?: string | null
          state?: string | null
          ticketmaster_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          count: number | null
          created_at: string | null
          id: string
          setlist_song_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          id?: string
          setlist_song_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          id?: string
          setlist_song_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_setlist_song_id_fkey"
            columns: ["setlist_song_id"]
            isOneToOne: false
            referencedRelation: "setlist_songs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_vote: {
        Args: { p_song_id: string; p_show_id: string }
        Returns: boolean
      }
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window: unknown }
        Returns: boolean
      }
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      complete_sync_item: {
        Args: { item_id: number }
        Returns: boolean
      }
      create_sync_tables: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      decrement_vote: {
        Args: { p_song_id: string; p_user_id: string }
        Returns: undefined
      }
      enqueue_sync: {
        Args:
          | {
              entity_type: string
              external_id: string
              reference_data?: Json
              priority?: number
              max_attempts?: number
            }
          | {
              entity_type: string
              service_name: string
              service_id: string
              reference_data?: Json
              priority?: number
              max_attempts?: number
            }
        Returns: number
      }
      exec_sql: {
        Args: { sql: string }
        Returns: undefined
      }
      exec_sql_direct: {
        Args: { sql: string }
        Returns: undefined
      }
      fail_sync_item: {
        Args: { item_id: number; error_message: string }
        Returns: boolean
      }
      get_random_artist_songs: {
        Args: { artist_uuid: string; count: number }
        Returns: {
          album_image_url: string | null
          album_name: string | null
          artist_id: string | null
          created_at: string | null
          duration_ms: number | null
          id: string
          name: string
          popularity: number | null
          preview_url: string | null
          setlist_fm_id: string | null
          spotify_id: string | null
          updated_at: string | null
          vote_count: number | null
        }[]
      }
      get_random_songs: {
        Args: { artist_id: string; count?: number }
        Returns: Json
      }
      get_show_vote_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          show_id: string
          vote_count: number
        }[]
      }
      get_sync_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          entity_type: string
          total: number
          last_24h: number
          last_sync: string
        }[]
      }
      get_sync_tasks: {
        Args: {
          p_status?: string
          p_entity_type?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          completed_at: string | null
          created_at: string | null
          data: Json | null
          dependencies: string[] | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          error: string | null
          id: string
          priority: number | null
          status: string
          updated_at: string | null
        }[]
      }
      get_user_follows: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          artist_id: string
          created_at: string
          artist: Json
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_vote: {
        Args: { p_song_id: string; p_user_id: string }
        Returns: undefined
      }
      manual_process_task: {
        Args: { task_id: string }
        Returns: Json
      }
      process_sync_tasks: {
        Args: { p_limit?: number }
        Returns: number
      }
      queue_artist_dependent_tasks: {
        Args: { artist_id: string; artist_ticketmaster_id: string }
        Returns: undefined
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sync_artist_data: {
        Args: { artist_id: string }
        Returns: undefined
      }
      sync_show_data: {
        Args: { show_id: string }
        Returns: undefined
      }
      test_sync_system: {
        Args: { target_id: string; entity_type: string }
        Returns: Json
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
