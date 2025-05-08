import { Database } from '@/integrations/supabase/types'

export type Artist = Database['public']['Tables']['artists']['Row']
export type Show = Database['public']['Tables']['shows']['Row'] & {
  artists?: Artist | null
  venues?: {
    id: string
    name: string
    city: string
    state: string | null
  } | null
}

export type PopularArtist = {
  artist_id: string
  artist_name: string
  total_votes: number
  unique_voters: number
  image_url?: string | null
}

export interface Song {
  id: string;
  title: string;
  duration: string;
  explicit: boolean;
  preview_url: string | null;
  spotify_id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Setlist {
  id: string;
  artist_id: string;
  show_id: string;
  song_order: number | null;
  songs: Song[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
