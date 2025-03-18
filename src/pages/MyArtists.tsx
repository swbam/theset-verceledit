
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/auth/AuthContext';
import ArtistCard from '@/components/artist/ArtistCard';
import { Button } from '@/components/ui/button';
import { Loader2, Music } from 'lucide-react';
import { getMyTopArtists } from '@/lib/spotify';

const MyArtists = () => {
  const { user, isAuthenticated, profile, loginWithSpotify } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to auth page if user is not authenticated
  useEffect(() => {
    if (!isAuthenticated && !user) {
      navigate('/auth');
    }
  }, [isAuthenticated, user, navigate]);
  
  // Fetch user's top artists from Spotify
  const { 
    data: topArtists, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['myTopArtists', user?.id],
    queryFn: getMyTopArtists,
    enabled: !!isAuthenticated && !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
  
  const handleConnectSpotify = () => {
    loginWithSpotify();
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Artists</h1>
            <p className="text-muted-foreground mt-1">
              Artists you follow or listen to on Spotify
            </p>
          </div>
          
          {isAuthenticated && (
            <Button 
              variant="outline" 
              onClick={handleConnectSpotify}
              className="bg-white text-black hover:bg-white/90"
            >
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 0C4.477 0 0 4.477 0 10c0 5.523 4.477 10 10 10 5.523 0 10-4.477 10-10 0-5.523-4.477-10-10-10zm4.586 14.424a.622.622 0 01-.858.205c-2.346-1.435-5.304-1.76-8.786-.964a.622.622 0 01-.277-1.215c3.809-.87 7.077-.496 9.713 1.116a.623.623 0 01.208.858zm1.223-2.722a.78.78 0 01-1.072.257c-2.687-1.652-6.786-2.13-9.965-1.166a.78.78 0 01-.973-.519.781.781 0 01.519-.972c3.642-1.106 8.146-.569 11.234 1.327a.78.78 0 01.257 1.073zm.105-2.835c-3.223-1.914-8.54-2.09-11.618-1.156a.935.935 0 11-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 01-.955 1.608z" />
              </svg>
              Refresh Spotify Connection
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your artists...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 border border-border rounded-lg bg-card p-8">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">Couldn't load your artists</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              There was an error connecting to Spotify. Please try refreshing your connection.
            </p>
            <Button onClick={handleConnectSpotify}>Connect Spotify</Button>
          </div>
        ) : topArtists?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topArtists.map((artist: any) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-border rounded-lg bg-card p-8">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No artists found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We couldn't find any artists from your Spotify account. Try refreshing your connection or exploring more music on Spotify.
            </p>
            <Button onClick={handleConnectSpotify}>Reconnect Spotify</Button>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default MyArtists;
