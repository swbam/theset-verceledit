
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Music, Search } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ShowCard from '@/components/shows/ShowCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Mock data for shows
const mockShows = [
  {
    id: 'show1',
    name: 'The Eras Tour',
    date: '2023-08-25T20:00:00',
    image_url: 'https://static01.nyt.com/images/2023/04/16/multimedia/16eras-intro-fzhm/16eras-intro-fzhm-mobileMasterAt3x.jpg',
    venue: {
      name: 'SoFi Stadium',
      city: 'Los Angeles',
      state: 'CA'
    },
    artist: {
      name: 'Taylor Swift'
    }
  },
  {
    id: 'show2',
    name: 'After Hours Tour',
    date: '2023-09-10T19:30:00',
    image_url: 'https://www.nme.com/wp-content/uploads/2022/01/the-weeknd-2000x1270-1.jpg',
    venue: {
      name: 'Madison Square Garden',
      city: 'New York',
      state: 'NY'
    },
    artist: {
      name: 'The Weeknd'
    }
  },
  {
    id: 'show3',
    name: 'Renaissance World Tour',
    date: '2023-10-05T19:00:00',
    image_url: 'https://media.npr.org/assets/img/2023/07/31/gettyimages-1258513641-1-_slide-bfce9d9ecab77f20e95b03495118f9b836fdf933-s1100-c50.jpg',
    venue: {
      name: 'Soldier Field',
      city: 'Chicago',
      state: 'IL'
    },
    artist: {
      name: 'Beyoncé'
    }
  },
  {
    id: 'show4',
    name: 'Music of the Spheres World Tour',
    date: '2023-11-15T20:00:00',
    image_url: 'https://www.nme.com/wp-content/uploads/2022/03/Coldplay-Music-Of-The-Spheres-tour-2022.jpg',
    venue: {
      name: 'Wembley Stadium',
      city: 'London',
      state: 'UK'
    },
    artist: {
      name: 'Coldplay'
    }
  }
];

const Shows = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // In a real app, this would fetch data from the API
  const { data: shows, isLoading } = useQuery({
    queryKey: ['shows', searchQuery],
    queryFn: () => new Promise(resolve => {
      setTimeout(() => {
        if (!searchQuery) {
          resolve(mockShows);
          return;
        }
        
        const filtered = mockShows.filter(show => 
          show.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          show.artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          show.venue.city.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        resolve(filtered);
      }, 500);
    }),
    initialData: mockShows,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Upcoming Shows</h1>
            <p className="text-muted-foreground max-w-2xl">
              Browse upcoming concerts and vote on setlists to help shape the perfect show
            </p>
          </div>
          
          <div className="mb-8">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="text"
                placeholder="Search by artist, show name or location..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 px-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear</span>
                </Button>
              )}
            </div>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse rounded-xl border border-border bg-card shadow-sm">
                  <div className="aspect-[16/9] bg-secondary rounded-t-xl"></div>
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-secondary rounded w-3/4"></div>
                    <div className="h-4 bg-secondary rounded w-1/2"></div>
                    <div className="h-4 bg-secondary rounded w-full"></div>
                    <div className="h-4 bg-secondary rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : shows.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {shows.map((show, index) => (
                <div 
                  key={show.id} 
                  className="animate-fade-in" 
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <ShowCard show={show} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 border border-border rounded-xl">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No shows found</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We couldn't find any shows matching your search. Try adjusting your search terms.
              </p>
              <Button onClick={() => setSearchQuery('')}>View all shows</Button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Shows;
