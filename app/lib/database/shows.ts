import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Show, ShowWithDetails } from '@/types/show';

export async function getShows(): Promise<Show[]> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('shows')
    .select(`
      *,
      venue:venues(*),
      artist:artists(*)
    `)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching shows:', error);
    return [];
  }

  return data as unknown as Show[];
}

export async function getShowById(id: string): Promise<ShowWithDetails | null> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('shows')
    .select(`
      *,
      venue:venues(*),
      artist:artists(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching show:', error);
    return null;
  }

  return data as unknown as ShowWithDetails;
}

export async function getUpcomingShows(limit = 10): Promise<Show[]> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('shows')
    .select(`
      *,
      venue:venues(*),
      artist:artists(*)
    `)
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching upcoming shows:', error);
    return [];
  }

  return data as unknown as Show[];
}

export async function getTrendingShows(limit = 10): Promise<Show[]> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('shows')
    .select(`
      *,
      venue:venues(*),
      artist:artists(*)
    `)
    .order('total_votes', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching trending shows:', error);
    return [];
  }

  return data as unknown as Show[];
}

export async function getShowsByArtist(artistId: string): Promise<Show[]> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('shows')
    .select(`
      *,
      venue:venues(*),
      artist:artists(*)
    `)
    .eq('artist_id', artistId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching artist shows:', error);
    return [];
  }

  return data as unknown as Show[];
}

export async function getShowsByVenue(venueId: string): Promise<Show[]> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('shows')
    .select(`
      *,
      venue:venues(*),
      artist:artists(*)
    `)
    .eq('venue_id', venueId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching venue shows:', error);
    return [];
  }

  return data as unknown as Show[];
} 