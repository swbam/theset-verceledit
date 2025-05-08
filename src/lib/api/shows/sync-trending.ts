import { supabase } from '@/integrations/supabase/client'

export const syncTrendingShows = async (limit = 10) => {
  // Fetch trending shows and return array, no side effects for now
  const { data: shows, error } = await supabase
    .from('shows')
    .select(`
      id,
      name,
      date,
      image_url,
      ticket_url,
      popularity,
      ticketmaster_id,
      artist:artists!shows_artist_id_fkey(
        id,
        name,
        image_url,
        ticketmaster_id
      ),
      venue:venues!shows_venue_id_fkey(
        id,
        name,
        city,
        state,
        ticketmaster_id
      ),
      votes(count)
    `)
    .gt('date', new Date().toISOString())
    .order('popularity', { ascending: false })
    .limit(limit * 2)

  if (error || !shows) {
    console.error('syncTrendingShows error:', error)
    return []
  }

  const withScores = shows.map((show: any) => {
    const totalVotes = show.votes?.reduce((sum: number, v: any) => sum + (v.count || 0), 0) || 0
    const score = totalVotes * 2 + (show.popularity || 0)
    return { ...show, score }
  })

  return withScores.sort((a: any, b: any) => b.score - a.score).slice(0, limit)
} 