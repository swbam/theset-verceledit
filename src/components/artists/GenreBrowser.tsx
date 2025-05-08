'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { createBrowserClient } from '@/lib/supabase/client'

interface GenreBrowserProps {
  selectedGenre?: string
}

export function GenreBrowser({ selectedGenre }: GenreBrowserProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createBrowserClient()

  const { data: genres = [] } = useQuery({
    queryKey: ['artist-genres'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('genre')
        .not('genre', 'is', null)
        .order('genre')

      if (error) throw error
      
      // Get unique genres
      const uniqueGenres = [...new Set(data.map(a => a.genre))]
      return uniqueGenres.filter(Boolean) // Remove any null/empty values
    }
  })

  const handleGenreSelect = (genre: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (genre) {
      params.set('genre', genre)
      params.delete('q') // Remove search query when genre is selected
    } else {
      params.delete('genre')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  if (!genres.length) {
    return null // Don't show genre browser if no genres available
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Browse by Genre</h3>
      <div className="flex flex-col space-y-2">
        <Button
          variant={!selectedGenre ? 'secondary' : 'ghost'}
          onClick={() => handleGenreSelect(null)}
          className="justify-start"
        >
          All Genres
        </Button>
        {genres.map((genre) => (
          <Button 
            key={genre}
            variant={selectedGenre === genre ? 'secondary' : 'ghost'}
            onClick={() => handleGenreSelect(genre)}
            className="justify-start"
          >
            {genre}
          </Button>
        ))}
      </div>
    </div>
  )
}
