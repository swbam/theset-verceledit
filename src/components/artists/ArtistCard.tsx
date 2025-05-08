import Link from 'next/link'
import { Artist } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ArtistCardProps {
  artist: Artist
}

export function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link href={`/artists/${artist.id}`} className="block group">
      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
        {artist.image_url && (
          <div className="aspect-[4/3] overflow-hidden">
            <img 
              src={artist.image_url} 
              alt={artist.name || 'Artist image'} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <CardHeader className="flex-grow">
          <CardTitle className="text-lg group-hover:text-primary transition-colors">
            {artist.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {/* Add more artist details if needed, e.g., upcoming show count */}
          <p>View Details</p>
        </CardContent>
      </Card>
    </Link>
  )
} 