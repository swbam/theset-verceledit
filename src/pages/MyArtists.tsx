import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getMyTopArtists } from '@/lib/spotify';
import ArtistCard from '@/components/artist/ArtistCard';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostgrestError } from '@supabase/supabase-js';

interface UserFollow {
  id: string;
  user_id: string;
  artist_id: string;
  created_at: string;
  artist: {
    id: string;
    name: string;
    image_url: string;
    genres: string[];
  };
}

const MyArtists = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [hasSpotifyToken, setHasSpotifyToken] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    // Check if the user is logged in and has a Spotify token
    const checkAuth = async () => {
      console.log("Checking auth status:", isAuthenticated ? "Authenticated" : "Not authenticated");
      
      if (!isAuthenticated) {
        console.log("User not authenticated, redirecting to login");
        navigate('/auth');
        return;
      }
      
      const { data } = await supabase.auth.getSession();
      const hasToken = !!data.session?.provider_token;
      setHasSpotifyToken(hasToken);
      
      console.log("Provider token check:", hasToken ? "Token present" : "No token");
      
      if (!hasToken) {
        console.log("No Spotify token found, but continuing to show manually followed artists");
      }
    };
    
    checkAuth();
  }, [isAuthenticated, navigate, user]);
  
  // Query for top Spotify artists
  const { 
    data: spotifyArtists, 
    isLoading: isLoadingSpotify, 
    error: spotifyError,
    refetch: refetchSpotify
  } = useQuery({
    queryKey: ['myTopArtists', user?.id],
    queryFn: getMyTopArtists,
    enabled: isAuthenticated && hasSpotifyToken,
    retry: 1,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Query for manually followed artists
  const {
    data: followedArtists,
    isLoading: isLoadingFollowed,
    error: followedError,
    refetch: refetchFollowed
  } = useQuery({
    queryKey: ['followedArtists', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID not available');
      
      // Use a raw query instead of the typed client to work around the type issue
      const { data, error } = await supabase.rpc('get_user_follows', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data as unknown as UserFollow[];
    },
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Function to sync a Spotify artist to the database and follow them
  const syncAndFollowArtist = async (artistId: string, artistName: string) => {
    try {
      // First, make sure the artist is synced in the database
      toast.loading(`Syncing artist ${artistName}...`);
      
      // Call our centralized API endpoint for syncing
      const syncResponse = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'artist',
          artistId
        })
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(errorData.error || 'Failed to sync artist');
      }

      // After successful sync, follow the artist
      const { data: syncData } = await syncResponse.json();
      const dbArtistId = syncData?.data?.id;

      if (!dbArtistId) {
        throw new Error('Artist sync did not return valid ID');
      }

      // Create follow relationship
      const { error: followError } = await supabase
        .from('user_follows')
        .upsert({
          user_id: user!.id,
          artist_id: dbArtistId,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,artist_id'
        });

      if (followError) throw followError;

      toast.dismiss();
      toast.success(`Now following ${artistName}`);
      
      // Refresh the followed artists list
      refetchFollowed();
    } catch (error) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to follow artist: ${errorMessage}`);
      console.error('Error following artist:', error);
    }
  };

  // Function to unfollow an artist
  const unfollowArtist = async (followId: string, artistName: string) => {
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('id', followId);

      if (error) throw error;
      
      toast.success(`Unfollowed ${artistName}`);
      refetchFollowed();
    } catch (error) {
      const errorMessage = 
        error instanceof Error ? error.message : 
        (error as PostgrestError)?.message || 'Unknown error';
      toast.error(`Failed to unfollow artist: ${errorMessage}`);
      console.error('Error unfollowing artist:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="text-muted-foreground mb-6">Please sign in to view your artists</p>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isLoading = isLoadingSpotify || isLoadingFollowed;
  const hasFollowedArtists = followedArtists && followedArtists.length > 0;
  const hasSpotifyArtists = spotifyArtists && spotifyArtists.length > 0;
  const hasAnyArtists = hasFollowedArtists || hasSpotifyArtists;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg">Loading your artists...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!hasAnyArtists) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md p-6">
            <h2 className="text-2xl font-bold mb-2">No Artists Found</h2>
            <p className="text-muted-foreground mb-6">
              {hasSpotifyToken ? 
                "We couldn't find any top artists in your Spotify account or followed artists." : 
                "You haven't followed any artists yet."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/artists')}>
                Browse Artists
              </Button>
              {!hasSpotifyToken && (
                <Button variant="outline" onClick={() => navigate('/auth?provider=spotify')}>
                  Connect Spotify
                </Button>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Your Artists</h1>
          <p className="text-muted-foreground">
            Artists you follow and recommendations from Spotify
          </p>
        </div>

        <Tabs value={activeTab} onChange={setActiveTab} className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All Artists</TabsTrigger>
            <TabsTrigger 
              value="followed"
              disabled={!hasFollowedArtists}
            >
              Followed Artists
            </TabsTrigger>
            <TabsTrigger 
              value="spotify"
              disabled={!hasSpotifyArtists}
            >
              Spotify Recommendations
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Show followed artists first */}
              {hasFollowedArtists && followedArtists.map((follow: UserFollow) => (
                <ArtistCard 
                  key={`followed-${follow.artist.id}`}
                  artist={{
                    id: follow.artist.id,
                    name: follow.artist.name,
                    image: follow.artist.image_url,
                    genres: follow.artist.genres?.slice(0, 2) || [],
                    upcoming_shows: undefined
                  }}
                  actions={[
                    {
                      label: 'Unfollow',
                      onClick: () => unfollowArtist(follow.id, follow.artist.name),
                      variant: 'outline'
                    }
                  ]}
                  isFollowed={true}
                />
              ))}
              
              {/* Then show Spotify recommendations that aren't already followed */}
              {hasSpotifyToken && spotifyArtists && spotifyArtists
                .filter((spotifyArtist: any) => {
                  // Only show Spotify artists that aren't already followed
                  return !followedArtists?.some(follow => 
                    follow.artist.id === spotifyArtist.id ||
                    follow.artist.name.toLowerCase() === spotifyArtist.name.toLowerCase()
                  );
                })
                .map((artist: any) => (
                  <ArtistCard 
                    key={`spotify-${artist.id}`}
                    artist={{
                      id: artist.id,
                      name: artist.name,
                      image: artist.image,
                      genres: artist.genres?.slice(0, 2) || [],
                      upcoming_shows: undefined
                    }}
                    actions={[
                      {
                        label: 'Follow',
                        onClick: () => syncAndFollowArtist(artist.id, artist.name),
                        variant: 'default',
                        icon: <Plus className="h-4 w-4 mr-2" />
                      }
                    ]}
                    source="Spotify"
                  />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="followed" className="mt-6">
            {hasFollowedArtists ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {followedArtists.map((follow: UserFollow) => (
                  <ArtistCard 
                    key={follow.artist.id}
                    artist={{
                      id: follow.artist.id,
                      name: follow.artist.name,
                      image: follow.artist.image_url,
                      genres: follow.artist.genres?.slice(0, 2) || [],
                      upcoming_shows: undefined
                    }}
                    actions={[
                      {
                        label: 'Unfollow',
                        onClick: () => unfollowArtist(follow.id, follow.artist.name),
                        variant: 'outline'
                      }
                    ]}
                    isFollowed={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center p-8">
                <p>You haven't followed any artists yet</p>
                <Button className="mt-4" onClick={() => navigate('/artists')}>
                  Browse Artists
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="spotify" className="mt-6">
            {hasSpotifyArtists ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {spotifyArtists.map((artist: any) => (
                  <ArtistCard 
                    key={artist.id}
                    artist={{
                      id: artist.id,
                      name: artist.name,
                      image: artist.image,
                      genres: artist.genres?.slice(0, 2) || [],
                      upcoming_shows: undefined
                    }}
                    actions={[
                      {
                        label: 'Follow',
                        onClick: () => syncAndFollowArtist(artist.id, artist.name),
                        variant: 'default',
                        icon: <Plus className="h-4 w-4 mr-2" />,
                        disabled: followedArtists?.some(
                          (follow: UserFollow) => 
                            follow.artist.id === artist.id || 
                            follow.artist.name.toLowerCase() === artist.name.toLowerCase()
                        )
                      }
                    ]}
                    source="Spotify"
                    isFollowed={followedArtists?.some(
                      (follow: UserFollow) => 
                        follow.artist.id === artist.id || 
                        follow.artist.name.toLowerCase() === artist.name.toLowerCase()
                    )}
                  />
                ))}
              </div>
            ) : hasSpotifyToken ? (
              <div className="text-center p-8">
                <p>No Spotify recommendations available</p>
                <Button 
                  className="mt-4" 
                  onClick={() => refetchSpotify()}
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="text-center p-8">
                <p>Connect your Spotify account to see recommendations</p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate('/auth?provider=spotify')}
                >
                  Connect Spotify
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default MyArtists;
