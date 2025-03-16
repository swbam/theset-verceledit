
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  PlusCircle, 
  Calendar, 
  Search, 
  Music, 
  MapPin, 
  ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShowCard from '@/components/shows/ShowCard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// This would come from your API in a real app
const mockFetchShows = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return [
    {
      id: "show1",
      name: "The Eras Tour",
      date: "2023-11-10T19:30:00",
      image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80",
      artist: {
        name: "Taylor Swift",
      },
      venue: {
        name: "Madison Square Garden",
        city: "New York",
        state: "NY",
      }
    },
    {
      id: "show2",
      name: "World Tour",
      date: "2023-12-15T20:00:00",
      image_url: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80",
      artist: {
        name: "Kendrick Lamar",
      },
      venue: {
        name: "Staples Center",
        city: "Los Angeles",
        state: "CA",
      }
    },
    {
      id: "show3",
      name: "Renaissance World Tour",
      date: "2024-01-20T19:00:00",
      image_url: "https://images.unsplash.com/photo-1565035010268-a3816f98589a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&q=80",
      artist: {
        name: "Beyoncé",
      },
      venue: {
        name: "Wembley Stadium",
        city: "London",
        state: "UK",
      }
    }
  ];
};

const Shows = () => {
  const [search, setSearch] = useState("");
  
  const { data: shows, isLoading } = useQuery({
    queryKey: ['shows'],
    queryFn: mockFetchShows
  });
  
  // Filter shows based on search input
  const filteredShows = shows ? shows.filter((show: any) => {
    const searchLower = search.toLowerCase();
    return (
      show.name.toLowerCase().includes(searchLower) ||
      show.artist.name.toLowerCase().includes(searchLower) ||
      show.venue.name.toLowerCase().includes(searchLower) ||
      `${show.venue.city}, ${show.venue.state}`.toLowerCase().includes(searchLower)
    );
  }) : [];
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Header section */}
        <section className="px-6 md:px-8 lg:px-12 py-12 bg-primary text-primary-foreground">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="md:w-1/2">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">Upcoming Shows</h1>
                <p className="md:text-lg opacity-90 mb-6">
                  Browse upcoming concerts and vote on the setlists you want to hear
                </p>
                
                <div className="flex space-x-4">
                  <Link to="/shows/create">
                    <Button size="lg" className="gap-2">
                      <PlusCircle size={18} />
                      Create Show
                    </Button>
                  </Link>
                  
                  <Link to="/artists">
                    <Button variant="outline" size="lg" className="gap-2 bg-white/10 border-white/20 hover:bg-white/20">
                      <Search size={18} />
                      Find Artists
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="hidden md:block md:w-1/3">
                <div className="relative">
                  <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <Music size={24} />
                  </div>
                  <div className="absolute top-12 -right-8 w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                    <Calendar size={28} />
                  </div>
                  <div className="absolute bottom-0 left-12 w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <div className="h-48 w-full rounded-2xl bg-gradient-to-r from-white/20 to-white/5 backdrop-blur">
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Shows section */}
        <section className="px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  placeholder="Search shows by artist, venue, or location..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card shadow-sm p-4">
                    <div className="animate-pulse space-y-4">
                      <div className="aspect-[16/9] rounded-lg bg-secondary"></div>
                      <div className="h-6 bg-secondary rounded w-3/4"></div>
                      <div className="h-4 bg-secondary rounded w-1/2"></div>
                      <div className="h-4 bg-secondary rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredShows && filteredShows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredShows.map((show: any) => (
                  <ShowCard key={show.id} show={show} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">No shows found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or browse artists to find shows
                </p>
                <Link 
                  to="/artists" 
                  className="inline-flex items-center text-primary hover:underline mt-4"
                >
                  Browse artists
                  <ArrowRight size={16} className="ml-1" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Shows;
