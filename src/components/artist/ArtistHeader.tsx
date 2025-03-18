import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ArtistHeaderProps {
  artistName: string;
  artistImage?: string;
  artistGenres?: string[];
  spotifyUrl?: string;
  followers?: number;
  monthlyListeners?: number;
}

const ArtistHeader = ({ 
  artistName, 
  artistImage, 
  artistGenres = [], 
  spotifyUrl,
  followers,
  monthlyListeners
}: ArtistHeaderProps) => {
  // Format number for display (e.g., 1.2M)
  const formatNumber = (num: number): string => {
    if (!num) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <section className="relative bg-black">
      <div className="absolute inset-0 overflow-hidden">
        {artistImage && (
          <div className="absolute inset-0 bg-center bg-cover opacity-30" 
               style={{ backgroundImage: `url(${artistImage})` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 pt-8 pb-12">
        <Link to="/artists" className="inline-flex items-center text-zinc-400 hover:text-white transition-colors mb-6">
          <ArrowLeft size={16} className="mr-2" />
          Back to artists
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end gap-8">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {artistName}
            </h1>
            
            {artistGenres && artistGenres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {artistGenres.map((genre, index) => (
                  <span 
                    key={index} 
                    className="text-sm px-3 py-1 bg-zinc-800/80 rounded-full text-zinc-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
            
            {(followers || monthlyListeners) && (
              <div className="flex items-center gap-4 text-zinc-400 mb-6">
                {followers > 0 && (
                  <div>
                    <span className="text-white font-semibold">{formatNumber(followers)}</span> followers
                  </div>
                )}
                {monthlyListeners > 0 && (
                  <div>
                    <span className="text-white font-semibold">{formatNumber(monthlyListeners)}</span> monthly listeners
                  </div>
                )}
              </div>
            )}
          </div>
          
          {spotifyUrl && (
            <div className="flex-shrink-0">
              <Button variant="outline" asChild className="bg-zinc-900/50 border-zinc-700">
                <a 
                  href={spotifyUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <Music className="mr-2 h-4 w-4" />
                  Listen on Spotify
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ArtistHeader;
