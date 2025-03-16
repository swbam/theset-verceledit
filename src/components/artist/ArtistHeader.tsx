
import React from 'react';
import { Link } from 'react-router-dom';
import { Music2, CalendarDays, ArrowLeft } from 'lucide-react';

interface ArtistHeaderProps {
  artistName: string;
  artistImage?: string;
  upcomingShowsCount: number;
}

const ArtistHeader = ({ artistName, artistImage, upcomingShowsCount }: ArtistHeaderProps) => {
  return (
    <section className="px-6 md:px-8 lg:px-12 py-12">
      <div className="max-w-7xl mx-auto">
        <Link to="/search" className="text-muted-foreground hover:text-foreground inline-flex items-center mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-2" />
          Back to search
        </Link>
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-48 h-48 rounded-xl overflow-hidden bg-secondary shadow-sm">
            {artistImage ? (
              <img 
                src={artistImage} 
                alt={artistName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Music2 size={64} className="text-foreground/20" />
              </div>
            )}
          </div>
          
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{artistName}</h1>
            
            <div className="mt-6">
              <div className="inline-flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                <CalendarDays size={14} className="mr-1" />
                {upcomingShowsCount} upcoming {upcomingShowsCount === 1 ? 'show' : 'shows'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistHeader;
