import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Music } from 'lucide-react';
import { Artist, TopTrack } from '@/types/artist';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface ArtistStatsProps {
  artist: Artist;
  topTracks: TopTrack[];
  isLoading?: boolean;
  hasError?: boolean;
}

const ArtistStats = ({ artist, topTracks, isLoading = false, hasError = false }: ArtistStatsProps) => {
  // Format large numbers with commas and abbreviations
  const formatNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Extract and format the artist stats
  const spotifyFollowers = artist.followers || 0;
  const monthlyListeners = artist.monthly_listeners || 0;

  // Extract genres (if available)
  const genres = artist.genres || [];

  return (
    <div className="bg-zinc-900 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2V16H2V2H16ZM16 0H2C0.9 0 0 0.9 0 2V16C0 17.1 0.9 18 2 18H16C17.1 18 18 17.1 18 16V2C18 0.9 17.1 0 16 0Z" fill="currentColor"/>
          <path d="M22 6H20V20H6V22H20C21.1 22 22 21.1 22 20V6Z" fill="currentColor"/>
          <path d="M9 6L12 9L15 6" fill="currentColor"/>
        </svg>
        Artist Stats
      </h2>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <p className="text-zinc-400 text-sm mb-1">Spotify Followers</p>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold">{formatNumber(spotifyFollowers)}</p>
          )}
        </div>
        <div>
          <p className="text-zinc-400 text-sm mb-1">Monthly Listeners</p>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold">{formatNumber(monthlyListeners)}</p>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Top Tracks</h3>
        
        {isLoading ? (
          <ul className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-zinc-400 mr-3">{i}.</span>
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-5 w-5 rounded-full" />
              </li>
            ))}
          </ul>
        ) : hasError ? (
          <div className="bg-zinc-800/50 rounded-md p-4 text-center">
            <p className="text-sm text-zinc-400 mb-2">
              Failed to load top tracks from Spotify
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : topTracks.length === 0 ? (
          <div className="bg-zinc-800/50 rounded-md p-4 text-center">
            <p className="text-sm text-zinc-400">
              No top tracks available for this artist
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {topTracks.map((track, index) => (
              <li key={track.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-zinc-400 mr-3">{index + 1}.</span>
                  <span>{track.name}</span>
                </div>
                {track.spotify_url && (
                  <a 
                    href={track.spotify_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-zinc-400 hover:text-white transition-colors"
                    aria-label={`Listen to ${track.name} on Spotify`}
                  >
                    <Music className="h-5 w-5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {genres.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Genres</h3>
          <div className="flex flex-wrap gap-2">
            {genres.slice(0, 4).map((genre, index) => (
              <Badge
                key={index}
                variant="outline"
                className="bg-zinc-800 text-white border-zinc-700 px-3 py-1"
              >
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {artist.formation_year && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-zinc-400 text-sm mb-1">Formed</p>
            <p className="font-semibold">{artist.formation_year}</p>
          </div>
          {artist.origin && (
            <div>
              <p className="text-zinc-400 text-sm mb-1">Origin</p>
              <p className="font-semibold">{artist.origin}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArtistStats; 