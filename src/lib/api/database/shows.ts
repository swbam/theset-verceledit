import { createServerClient } from '@/lib/supabase/server'
import { Show } from '@/lib/types'

export async function getTrendingShows(): Promise<Show[]> {
  const supabase = createServerClient()
  
  const { data: shows, error } = await supabase
    .from('shows')
    .select(`
      *,
      artists (
        id,
        name,
        image_url
      ),
      venues (
        id,
        name,
        city,
        state
      )
    `)
    .order('date', { ascending: true })
    .limit(6)

  if (error) {
    console.error('Error fetching trending shows:', error)
    return []
  }

  return shows || []
}

export async function getPopularArtists() {
  const supabase = createServerClient()
  
  const { data: artists, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      image_url,
      votes:songs (
        count
      )
    `)
    .order('votes', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching popular artists:', error)
    return []
  }

  return artists.map(artist => ({
    artist_id: artist.id,
    artist_name: artist.name,
    total_votes: artist.votes?.[0]?.count || 0,
    unique_voters: 0, // TODO: Implement unique voters count
    image_url: artist.image_url
  }))
} 