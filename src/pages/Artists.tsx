import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, Music, Sparkles } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import ArtistCard from '@/components/artist/ArtistCard';
import { fetchFeaturedArtists } from '@/lib/ticketmaster';
import SearchBar from '@/components/ui/SearchBar';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { popularMusicGenres } from '@/lib/ticketmaster';

const Artists = () => {
  const navigate = useNavigate();
  
  // Set document title
  useDocumentTitle('Popular Artists', 'Discover the most popular artists with upcoming shows and vote on their setlists');
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Fetch featured artists
  const { 
    data: featuredArtists = [], 
    isLoading: isLoadingArtists,
    error: artistsError
  } = useQuery({
    queryKey: ['featuredArtists'],
    queryFn: () => fetchFeaturedArtists(),
  });
  
  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };
  
  const handleGenreClick = (genre: string) => {
    navigate(`/search?genre=${encodeURIComponent(genre)}`);
  };
  
  // Animation variants for staggered children
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero section */}
        <section className="bg-gradient-to-b from-black to-zinc-900 py-16 px-4">
          <div className="container mx-auto max-w-5xl text-center">
            <div className="max-w-3xl mx-auto mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Discover Artists & Vote on Setlists</h1>
              <p className="text-lg text-zinc-300 mb-8">
                Find your favorite artists with upcoming shows and help shape their setlists through fan voting.
              </p>
              
              <SearchBar 
                placeholder="Search for artists with upcoming shows..." 
                onSearch={handleSearch}
                className="max-w-xl mx-auto"
              />
            </div>
          </div>
        </section>
        
        {/* Featured artists section */}
        <section className="py-16 px-4 bg-zinc-950">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <h2 className="text-2xl font-bold">Featured Artists</h2>
                </div>
                <p className="text-zinc-400">Popular artists with upcoming shows</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/search')}
                className="flex items-center gap-1"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            
            {isLoadingArtists ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="bg-zinc-900/50 animate-pulse rounded-lg h-[300px]"></div>
                ))}
              </div>
            ) : featuredArtists.length > 0 ? (
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {featuredArtists.map((artist: any) => (
                  <motion.div key={artist.id} variants={item}>
                    <ArtistCard artist={artist} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-zinc-800">
                <Music className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
                <h3 className="text-xl font-medium mb-2">No artists found</h3>
                <p className="text-zinc-500 mb-6">
                  We couldn't find any featured artists at the moment.
                </p>
                <Button onClick={() => navigate('/search')}>Search for Artists</Button>
              </div>
            )}
          </div>
        </section>
        
        {/* Browse by genre section */}
        <section className="py-16 px-4 bg-zinc-900">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Browse by Genre</h2>
              <p className="text-zinc-400">Explore artists by your favorite music genres</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {popularMusicGenres.map((genre) => (
                <Button 
                  key={genre.id} 
                  variant="outline" 
                  className="h-auto py-6 flex flex-col items-center justify-center bg-zinc-800/50 hover:bg-zinc-800 border-zinc-700 rounded-lg"
                  onClick={() => handleGenreClick(genre.name)}
                >
                  <span className="text-2xl mb-2">{genre.emoji}</span>
                  <span>{genre.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </section>
        
        {/* Call to action */}
        <section className="py-16 px-4 bg-gradient-to-b from-zinc-900 to-black">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to influence your next concert experience?</h2>
            <p className="text-lg text-zinc-300 mb-8">
              Sign in with Spotify to discover shows from artists you follow and vote on your favorite songs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                onClick={() => navigate('/search')}
              >
                Find Shows
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/auth')}
              >
                Sign in with Spotify
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Artists;
