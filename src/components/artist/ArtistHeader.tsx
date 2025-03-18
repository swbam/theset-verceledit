import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Music, Users, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar } from '@/components/ui/avatar';

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
  const isMobile = useIsMobile();
  
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
    <section 
      className="relative bg-cover bg-center header-gradient"
      style={{
        backgroundImage: artistImage 
          ? `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${artistImage})` 
          : undefined,
        height: 'auto',
        maxHeight: isMobile ? '35vh' : 'auto',
      }}
    >
      <div className={`px-4 md:px-8 lg:px-12 ${isMobile ? 'py-4' : 'py-12'} relative z-10`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <Link to="/artists" className="text-white/80 hover:text-white inline-flex items-center transition-colors">
              <ArrowLeft size={16} className="mr-1" />
              <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Back to artists</span>
            </Link>
            
            {artistGenres && artistGenres.length > 0 && (
              <span className="inline-block bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                {artistGenres[0]}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            {artistImage && (
              <Avatar className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} rounded-full border-2 border-white/20 shadow-lg`}>
                <img src={artistImage} alt={artistName} className="object-cover" />
              </Avatar>
            )}
            
            <div>
              <h1 className={`${isMobile ? 'text-xl' : 'text-3xl md:text-4xl lg:text-5xl'} font-bold text-white`}>
                {artistName}
              </h1>
              
              {artistGenres && artistGenres.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {artistGenres.slice(0, isMobile ? 2 : 3).map((genre, index) => (
                    <span 
                      key={index} 
                      className={`${isMobile ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'} bg-zinc-800/80 rounded-full text-zinc-300`}
                    >
                      {genre}
                    </span>
                  ))}
                  {artistGenres.length > (isMobile ? 2 : 3) && (
                    <span className="text-xs text-zinc-400 self-center">+{artistGenres.length - (isMobile ? 2 : 3)} more</span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-6 mt-2`}>
            {followers > 0 && (
              <div className={`flex items-center text-white/80 ${isMobile ? 'text-xs' : ''}`}>
                <Users size={isMobile ? 14 : 18} className="mr-1.5 text-white/60" />
                <span className="text-white font-semibold">{formatNumber(followers)}</span> followers
              </div>
            )}
            
            {monthlyListeners > 0 && (
              <div className={`flex items-center text-white/80 ${isMobile ? 'text-xs' : ''}`}>
                <BarChart size={isMobile ? 14 : 18} className="mr-1.5 text-white/60" />
                <span className="text-white font-semibold">{formatNumber(monthlyListeners)}</span> monthly listeners
              </div>
            )}
          </div>
          
          {spotifyUrl && (
            <div className={`${isMobile ? 'mt-2' : 'mt-6'}`}>
              <Button asChild className="bg-[#1DB954] hover:bg-[#1DB954]/90 text-black" size={isMobile ? "sm" : "default"}>
                <a 
                  href={spotifyUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <Music className="mr-2 h-4 w-4" />
                  <span>Listen on Spotify</span>
                  <ExternalLink size={isMobile ? 14 : 16} className="ml-2" />
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
