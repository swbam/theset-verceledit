import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Music } from 'lucide-react';
import { SpotifyTrack } from '@/lib/spotify/types';

interface ArtistStatsProps {
  artist: any;
  topTracks: SpotifyTrack[];
}

const ArtistStats = ({ artist, topTracks }: ArtistStatsProps) => {
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
  const monthlyListeners = artist.monthly_listeners || artist.popularity * 1000000 || 0;

  // Extract and format genres
  const genres = artist.genres || ['Pop', 'Rock', 'Alternative', 'Indie'];

  // Formation year and origin (fallbacks if not available)
  const formationYear = artist.formed || artist.formation_year || '1996';
  const origin = artist.origin || 'London, England';

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
          <p className="text-2xl font-bold">{formatNumber(spotifyFollowers)}</p>
        </div>
        <div>
          <p className="text-zinc-400 text-sm mb-1">Monthly Listeners</p>
          <p className="text-2xl font-bold">{formatNumber(monthlyListeners)}</p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Top Tracks</h3>
        <ul className="space-y-3">
          {topTracks && topTracks.length > 0 ? (
            topTracks.slice(0, 5).map((track, index) => (
              <li key={track.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-zinc-400 mr-3">{index + 1}.</span>
                  <span>{track.name}</span>
                </div>
                <Music className="h-5 w-5 text-zinc-400" />
              </li>
            ))
          ) : (
            // Fallback tracks if Spotify tracks not available
            [
              "Yellow",
              "Viva La Vida",
              "The Scientist",
              "Fix You",
              "Paradise"
            ].map((trackName, index) => (
              <li key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-zinc-400 mr-3">{index + 1}.</span>
                  <span>{trackName}</span>
                </div>
                <Music className="h-5 w-5 text-zinc-400" />
              </li>
            ))
          )}
        </ul>
      </div>

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

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-zinc-400 text-sm mb-1">Formed</p>
          <p className="font-semibold">{formationYear}</p>
        </div>
        <div>
          <p className="text-zinc-400 text-sm mb-1">Origin</p>
          <p className="font-semibold">{origin}</p>
        </div>
      </div>
    </div>
  );
};

export default ArtistStats; 