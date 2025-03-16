
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { popularMusicGenres } from '@/lib/ticketmaster';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ShowsByGenre from '@/components/artists/ShowsByGenre';
import SearchBar from '@/components/ui/SearchBar';
import ArtistSearchResults from '@/components/artists/ArtistSearchResults';
import { useNavigate } from 'react-router-dom';

const Artists = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showResults, setShowResults] = React.useState(false);

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
                {/* @ts-ignore - Suppressing TypeScript error while component props are fixed */}
                <ShowsByGenre genreId={genre.id} genreName={genre.name} />
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
