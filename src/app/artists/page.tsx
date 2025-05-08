import { Suspense } from 'react'
import { SearchBar } from '@/components/search/SearchBar'
import { ArtistCard } from '@/components/artists/ArtistCard'
import { GenreBrowser } from '@/components/artists/GenreBrowser'
import { createServerClient } from '@/lib/supabase/server'
import { Artist } from '@/lib/types'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every minute

async function getArtists(searchTerm?: string, genre?: string): Promise<Artist[]> {
  const supabase = createServerClient()
  let query = supabase
    .from('artists')
    .select(`
      id,
      name,
      image_url,
      spotify_id,
      ticketmaster_id,
      upcoming_shows_count,
      genre,
      created_at
    `)
    .order('upcoming_shows_count', { ascending: false })
    .order('name', { ascending: true })

  if (searchTerm) {
    query = query.ilike('name', `%${searchTerm}%`)
  }

  if (genre) {
    query = query.eq('genre', genre)
  }

  const { data: artists, error } = await query.limit(24)

  if (error) {
    console.error('Error fetching artists:', error)
    throw new Error('Failed to fetch artists')
  }

  return artists || []
}

async function getTrendingArtists(): Promise<Artist[]> {
  const supabase = createServerClient()
  const { data: artists, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      image_url,
      spotify_id,
      ticketmaster_id,
      upcoming_shows_count,
      genre,
      created_at
    `)
    .order('upcoming_shows_count', { ascending: false })
    .limit(12)

  if (error) {
    console.error('Error fetching trending artists:', error)
    throw new Error('Failed to fetch trending artists')
  }

  return artists || []
}

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams?: { q?: string; genre?: string }
}) {
  const searchTerm = searchParams?.q
  const selectedGenre = searchParams?.genre

  try {
    const [artists, trendingArtists] = await Promise.all([
      getArtists(searchTerm, selectedGenre),
      !searchTerm && !selectedGenre ? getTrendingArtists() : Promise.resolve([])
    ])

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Discover Artists</h1>
        
        <Suspense fallback={<div className="h-12 w-full animate-pulse bg-muted rounded-md" />}>
          <SearchBar initialQuery={searchTerm} placeholder="Search artists..." />
        </Suspense>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-md" />}>
              <GenreBrowser selectedGenre={selectedGenre} />
            </Suspense>
          </div>

          <div className="md:col-span-3">
            {searchTerm || selectedGenre ? (
              <section>
                <h2 className="text-2xl font-semibold mb-4">
                  {artists.length > 0 ? 'Search Results' : 'No artists found'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {artists.map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            ) : (
              <section>
                <h2 className="text-2xl font-semibold mb-4">Trending Artists</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingArtists.map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Artists page error:', error)
    notFound()
  }
} 