
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ArtistCard from '../artist/ArtistCard';

// Mock data for featured artists
const featuredArtists = [
  {
    id: 'artist1',
    name: 'Taylor Swift',
    image: 'https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0',
    genres: ['pop', 'pop rock'],
    upcoming_shows: 3
  },
  {
    id: 'artist2',
    name: 'The Weeknd',
    image: 'https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb',
    genres: ['r&b', 'pop'],
    upcoming_shows: 2
  },
  {
    id: 'artist3',
    name: 'Kendrick Lamar',
    image: 'https://i.scdn.co/image/ab6761610000e5eb437b9e2a82505b3d93ff1022',
    genres: ['hip hop', 'rap'],
    upcoming_shows: 4
  },
  {
    id: 'artist4',
    name: 'Billie Eilish',
    image: 'https://i.scdn.co/image/ab6761610000e5ebd8b9980db67272cb4d2c3daf',
    genres: ['pop', 'alt-pop'],
    upcoming_shows: 1
  }
];

const FeaturedArtists = () => {
  return (
    <section className="py-20 px-6 md:px-8 lg:px-12 bg-secondary/50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
          <div>
            <span className="block text-sm font-medium text-muted-foreground mb-2">Featured</span>
            <h2 className="text-3xl md:text-4xl font-bold">Trending Artists</h2>
          </div>
          
          <Link 
            to="/artists" 
            className="mt-4 md:mt-0 group inline-flex items-center text-foreground hover:text-primary transition-colors"
          >
            View all artists
            <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {featuredArtists.map(artist => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedArtists;
