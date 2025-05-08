'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, Music } from 'lucide-react'
import { searchArtistsWithEvents } from '@/lib/ticketmaster'
import { SearchBar } from '@/components/search/SearchBar'
import ArtistSearchResults from '@/components/search/ArtistSearchResults'

interface Artist {
  id: string
  name: string
  image?: string
  genres?: string[]
  upcomingShows: number
}

export default function SearchClient() {
  const router = useRouter()
  const params = useSearchParams()

  const query = params.get('q') ?? ''
  const [debounced, setDebounced] = useState(query)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data: artists = [], isLoading } = useQuery<Artist[]>({
    queryKey: ['artists', debounced],
    queryFn: () => searchArtistsWithEvents(debounced),
    enabled: debounced.length > 2,
  })

  const handleArtistSelect = (artist: Artist) => {
    router.push(`/artists/${artist.id}`)
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Find Artists with Upcoming Shows</h1>
      <div className="relative max-w-2xl mx-auto mb-12">
        <SearchBar
          placeholder="Search for artists with upcoming shows..."
          initialQuery={query}
        />
        {query.length > 2 && (
          <ArtistSearchResults
            artists={artists}
            isLoading={isLoading}
            onSelect={handleArtistSelect}
            className="mt-2"
          />
        )}
      </div>
      {!query && (
        <div className="text-center p-12 border rounded-xl border-border">
          <SearchIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-medium mb-2">Search for artists with upcoming shows</h3>
          <p className="text-muted-foreground">Find artists and discover their upcoming concerts</p>
        </div>
      )}
      {query.length > 2 && !isLoading && artists.length === 0 && (
        <div className="text-center p-12 border rounded-xl border-border">
          <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-medium mb-2">No artists found</h3>
          <p className="text-muted-foreground">Try a different search term or check back later for more shows</p>
        </div>
      )}
    </div>
  )
} 