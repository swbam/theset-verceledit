
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { popularMusicGenres } from '@/lib/ticketmaster';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ShowsByGenre from '@/components/artists/ShowsByGenre';
import SearchBar from '@/components/ui/SearchBar';
import ArtistSearchResults from '@/components/artists/ArtistSearchResults';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchFeaturedArtists } from '@/lib/ticketmaster';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const Artists = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showResults, setShowResults] = React.useState(false);

  const { data: featuredArtists = [], isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchFeaturedArtists(8), 
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleQueryChange = (query: string) => {
    setSearchQuery(query);
    setShowResults(query.length > 2);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="px-6 md:px-8 lg:px-12 py-8 max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-6">Discover Live Music</h1>
          
          <div className="max-w-xl mx-auto mb-12">
            <SearchBar 
              placeholder="Search for artists with upcoming shows..." 
              onSearch={handleSearch}
              onChange={handleQueryChange}
              className="w-full"
            >
              {showResults && <ArtistSearchResults query={searchQuery} />}
            </SearchBar>
          </div>
          
          {/* Featured Artists Section */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Featured Artists</h2>
            {isLoadingFeatured ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Array(8).fill(0).map((_, i) => (
                  <Card key={i} className="p-4 flex flex-col items-center animate-pulse">
                    <Skeleton className="h-20 w-20 rounded-full mb-3" />
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {featuredArtists.map((artist, index) => (
                  <Link 
                    key={artist.id}
                    to={`/artists/${artist.id}`}
                    className="group p-4 border border-border rounded-lg hover:border-primary/30 hover:shadow-md transition-all flex flex-col items-center bg-card"
                  >
                    <Avatar className="h-20 w-20 mb-3 group-hover:ring-2 group-hover:ring-primary/30 transition-all">
                      {artist.image ? (
                        <img 
                          src={artist.image} 
                          alt={artist.name}
                          className="object-cover"
                        />
                      ) : (
                        <div className="bg-primary/10 h-full w-full flex items-center justify-center text-primary font-bold text-xl">
                          {artist.name.charAt(0)}
                        </div>
                      )}
                    </Avatar>
                    <h3 className="font-medium text-center group-hover:text-primary transition-colors">
                      {artist.name}
                    </h3>
                    {artist.genres && artist.genres.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {artist.genres[0]}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
          
          <Tabs defaultValue={popularMusicGenres[0].id} className="space-y-10">
            <TabsList className="w-full h-auto flex flex-wrap justify-start gap-2 bg-transparent">
              {popularMusicGenres.map(genre => (
                <TabsTrigger 
                  key={genre.id} 
                  value={genre.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {genre.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {popularMusicGenres.map(genre => (
              <TabsContent key={genre.id} value={genre.id} className="space-y-10 mt-6">
                <ShowsByGenre 
                  genreId={genre.id} 
                  genreName={genre.name} 
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Artists;
