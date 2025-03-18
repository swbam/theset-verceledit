import React from 'react';
import { Music, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ArtistStatsProps {
  spotifyFollowers?: number;
  monthlyListeners?: number;
  topTracks?: Array<{ id: string; name: string }>;
  genres?: string[];
  formed?: string;
  origin?: string;
  spotifyId?: string;
}

const ArtistStats = ({
  spotifyFollowers,
  monthlyListeners,
  topTracks = [],
  genres = [],
  formed,
  origin,
  spotifyId,
}: ArtistStatsProps) => {
  // Format numbers with commas
  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    return num.toLocaleString('en-US');
  };
  
  // Format to millions if over 1M
  const formatMillions = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    return formatNumber(num);
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
      <h2 className="flex items-center text-xl font-bold mb-6">
        <Music className="mr-2 h-5 w-5" />
        Artist Stats
      </h2>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="text-center">
          <div className="text-white/60 text-sm mb-1">
            Spotify Followers
          </div>
          <div className="text-2xl font-bold">
            {formatMillions(spotifyFollowers)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-white/60 text-sm mb-1">
            Monthly Listeners
          </div>
          <div className="text-2xl font-bold">
            {formatMillions(monthlyListeners)}
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="text-white/80 font-medium mb-3">Top Tracks</h3>
        <ul className="space-y-2">
          {topTracks && topTracks.length > 0 ? (
            topTracks.map((track, index) => (
              <li key={track.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-white/40 w-5 text-right mr-3">{index + 1}.</span>
                  <span>{track.name}</span>
                </div>
                <div className="text-white/70">
                  <Music className="h-4 w-4" />
                </div>
              </li>
            ))
          ) : (
            <li className="text-white/40 text-center py-2">No tracks available</li>
          )}
        </ul>
      </div>
      
      {genres && genres.length > 0 && (
        <div className="mb-8">
          <h3 className="text-white/80 font-medium mb-3">Genres</h3>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre, index) => (
              <Badge 
                key={index} 
                variant="secondary"
                className="bg-zinc-800 hover:bg-zinc-700 text-white border-none"
              >
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        {formed && (
          <div>
            <h3 className="text-white/80 font-medium mb-1">Formed</h3>
            <div className="text-white/60">{formed}</div>
          </div>
        )}
        
        {origin && (
          <div>
            <h3 className="text-white/80 font-medium mb-1">Origin</h3>
            <div className="text-white/60">{origin}</div>
          </div>
        )}
      </div>
      
      {spotifyId && (
        <div className="text-center">
          <Button 
            variant="outline" 
            className="w-full"
            asChild
          >
            <a 
              href={`https://open.spotify.com/artist/${spotifyId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center"
            >
              Listen on Spotify
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ArtistStats; 