import { searchArtistsWithEvents } from '@/lib/ticketmaster';
import { Artist } from '@/types/artist';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { Music } from 'lucide-react';

interface SearchPageProps {
  searchParams: { q?: string };
}

// Server component that fetches search results
async function SearchResults({ query }: { query: string }) {
  try {
    const artists = await searchArtistsWithEvents(query);

    if (artists.length === 0) {
      return (
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4">No artists found</h2>
          <p className="text-zinc-400 mb-8">
            No artists with upcoming shows match &quot;{query}&quot;.
          </p>
          <p className="text-zinc-500">
            Try a different search term or check back later.
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching search results:', error);
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="text-zinc-400">
          There was an error searching for artists. Please try again.
        </p>
      </div>
    );
  }
}

// Artist card component
function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link
      href={`/artist/${artist.id}`}
      className="group bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all hover:shadow-lg"
    >
      <div className="relative aspect-square">
        {artist.image ? (
          <Image
            src={artist.image}
            alt={artist.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <Music size={48} className="text-zinc-500" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg truncate group-hover:text-violet-400 transition-colors">
          {artist.name}
        </h3>
        {artist.genres && artist.genres.length > 0 && (
          <p className="text-zinc-400 text-sm truncate mt-1">
            {artist.genres.slice(0, 3).join(', ')}
          </p>
        )}
        <div className="mt-3 py-1 px-3 bg-violet-900/30 text-violet-300 text-xs font-medium rounded-full inline-block">
          Has upcoming shows
        </div>
      </div>
    </Link>
  );
}

// Loading state
function SearchResultsLoading() {
  return (
    <div className="text-center py-16">
      <div className="animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-1/4 mx-auto mb-8"></div>
        <div className="h-4 bg-zinc-800 rounded w-1/3 mx-auto"></div>
      </div>
    </div>
  );
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {query ? `Search results for "${query}"` : 'Search Results'}
      </h1>
      <p className="text-zinc-400 mb-6">
        {query
          ? 'Artists with upcoming shows matching your search'
          : 'Enter a search term to find artists with upcoming shows'}
      </p>

      {query ? (
        <Suspense fallback={<SearchResultsLoading />}>
          <SearchResults query={query} />
        </Suspense>
      ) : (
        <div className="text-center py-16">
          <p className="text-zinc-500">
            Use the search bar above to find artists with upcoming shows.
          </p>
        </div>
      )}
    </main>
  );
} 