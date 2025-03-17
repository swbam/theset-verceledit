
import React from 'react';
import { Link } from 'react-router-dom';
import { Music2, CalendarDays, ArrowLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface ArtistHeaderProps {
  artistName: string;
  artistImage?: string;
  upcomingShowsCount: number;
}

const ArtistHeader = ({ artistName, artistImage, upcomingShowsCount }: ArtistHeaderProps) => {
  const isMobile = useIsMobile();
  
  return (
    <section className="px-6 md:px-8 lg:px-12 header-gradient relative z-10">
      <div className={`max-w-7xl mx-auto ${isMobile ? 'py-6' : 'py-12'}`}>
        <Link to="/search" className="text-white/70 hover:text-white inline-flex items-center mb-4 md:mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" />
          Back to search
        </Link>
        
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          <div className={`${isMobile ? 'w-20 h-20' : 'w-32 h-32'} md:w-48 md:h-48 rounded-xl overflow-hidden bg-white/5 shadow-lg border border-white/10 flex-shrink-0`}>
            {artistImage ? (
              <img 
                src={artistImage} 
                alt={artistName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Music2 size={isMobile ? 32 : 64} className="text-white/20" />
              </div>
            )}
          </div>
          
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} md:text-4xl lg:text-5xl font-bold text-white text-gradient`}>{artistName}</h1>
            
            <div className={`${isMobile ? 'mt-3' : 'mt-6'} flex flex-wrap items-center gap-3`}>
              <div className="inline-flex items-center bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-sm">
                <CalendarDays size={14} className="mr-1" />
                {upcomingShowsCount} upcoming {upcomingShowsCount === 1 ? 'show' : 'shows'}
              </div>
              
              <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Heart size={14} className="mr-1.5" />
                Follow
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistHeader;
