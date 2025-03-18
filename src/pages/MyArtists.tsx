import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ArtistCard from '@/components/artist/ArtistCard';
import { supabase } from '@/lib/supabase';
import { getSpotifyUserTopArtists, getSpotifyUserFollowedArtists } from '@/lib/spotify/user';
import { LoadingIndicator } from '@/components/ui/loading';
import { saveArtistToDatabase } from '@/lib/api/db/artist-utils';

const MyArtists = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [followedArtists, setFollowedArtists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  useEffect(() => {
    document.title = 'My Artists | TheSet';
  }, []);
  
  useEffect(() => {
    const fetchPersonalizedArtists = async () => {
      if (authLoading) return;
      
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Check if we have a Spotify provider token in local storage
        const spotifyToken = localStorage.getItem('spotify_provider_token');
        if (!spotifyToken) {
          console.log('No Spotify token found, trying to fetch artists anyway');
        }
        
        // Fetch the user's top artists from Spotify
        console.log('Fetching Spotify top artists');
        const topArtistsData = await getSpotifyUserTopArtists();
        
        // Fetch the user's followed artists from Spotify
        console.log('Fetching Spotify followed artists');
        const followedArtistsData = await getSpotifyUserFollowedArtists();
        
        if (topArtistsData && topArtistsData.length > 0) {
          console.log(`Found ${topArtistsData.length} top artists`);
          setTopArtists(topArtistsData);
          
          // Save artists to database in background
          const promises = topArtistsData.map(artist => 
            saveArtistToDatabase(artist).catch(err => 
              console.error(`Error saving artist ${artist.name}:`, err)
            )
          );
          
          await Promise.allSettled(promises);
        } else {
          console.log('No top artists found or error fetching them');
        }
        
        if (followedArtistsData && followedArtistsData.length > 0) {
          console.log(`Found ${followedArtistsData.length} followed artists`);
          setFollowedArtists(followedArtistsData);
          
          // Save artists to database in background
          const promises = followedArtistsData.map(artist => 
            saveArtistToDatabase(artist).catch(err => 
              console.error(`Error saving artist ${artist.name}:`, err)
            )
          );
          
          await Promise.allSettled(promises);
        } else {
          console.log('No followed artists found or error fetching them');
        }
        
        // If we couldn't get any artists, show an error
        if ((!topArtistsData || topArtistsData.length === 0) && 
            (!followedArtistsData || followedArtistsData.length === 0)) {
          setFetchError('Could not load your Spotify artists. Please try logging in again.');
        }
      } catch (error) {
        console.error('Error fetching personalized artists:', error);
        setFetchError('Failed to load your Spotify artists. Please try again later.');
        toast.error('Failed to load your artists from Spotify');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPersonalizedArtists();
  }, [isAuthenticated, user, authLoading]);
  
  const renderContent = () => {
    if (authLoading || isLoading) {
      return (
        <div className="flex justify-center items-center py-20">
          <LoadingIndicator size="lg" message="Loading your artists from Spotify..." />
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4">Connect with Spotify</h2>
          <p className="text-zinc-400 mb-6">Sign in with your Spotify account to see your favorite artists and those you follow.</p>
          <Link 
            to="/auth" 
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] px-6 py-3 font-medium text-black transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" fill="#1DB954"/>
              <path d="M16.7303 16.5C16.476 16.5 16.2411 16.4078 16.0454 16.2122C14.1925 14.3593 11.5943 14.2616 9.57447 14.9465C9.25568 15.0636 8.92318 15.0245 8.63932 14.8473C8.35547 14.6701 8.16872 14.3593 8.13675 14.01C8.10479 13.6607 8.21322 13.3297 8.4385 13.0752C8.66379 12.8207 8.9795 12.6804 9.3288 12.6804C12.0247 11.8677 15.3327 12.0131 17.7358 14.4162C18.1153 14.7958 18.1153 15.4152 17.7358 15.7948C17.546 16.0262 17.6665 16.5 16.7303 16.5Z" fill="white"/>
              <path d="M17.9167 13.4993C17.6368 13.4993 17.3643 13.3913 17.1512 13.1784C14.9598 10.9871 11.6518 10.462 8.64 11.2747C8.06667 11.4431 7.45333 11.1245 7.28507 10.5514C7.11667 9.97822 7.4348 9.36511 8.00813 9.19671C11.6115 8.21324 15.5677 8.84996 18.3009 11.583C18.6723 11.9544 18.6723 12.5675 18.3009 12.9389C18.0685 13.3104 18.1967 13.4993 17.9167 13.4993Z" fill="white"/>
              <path d="M19.335 10.5C19.0551 10.5 18.7826 10.392 18.5695 10.1789C15.891 7.50036 11.3963 6.85046 7.91317 7.85732C7.33984 8.02572 6.7265 7.70759 6.55825 7.13446C6.38984 6.56114 6.70797 5.94803 6.2813 5.77959C14.3805 4.54264 19.0694 5.36888 22.3254 8.62494C22.6969 8.99635 22.6969 9.60946 22.3254 9.98087C22.093 10.2132 21.715 10.5 19.335 10.5Z" fill="white"/>
            </svg>
            Sign in with Spotify
          </Link>
        </div>
      );
    }
    
    if (fetchError) {
      return (
        <div className="text-center py-16">
          <div className="text-destructive mb-4">{fetchError}</div>
          <button 
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    if (topArtists.length === 0 && followedArtists.length === 0) {
      return (
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4">No Artists Found</h2>
          <p className="text-zinc-400 mb-6">
            We couldn't find any artists you listen to or follow on Spotify. Try listening to more music or following some artists!
          </p>
          <Link 
            to="/artists" 
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Browse Artists
          </Link>
        </div>
      );
    }
    
    return (
      <>
        {topArtists.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Your Top Artists</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {topArtists.slice(0, 10).map(artist => (
                <ArtistCard 
                  key={artist.id}
                  id={artist.id}
                  name={artist.name}
                  image={artist.image || artist.image_url}
                  upcomingShows={artist.upcoming_shows || artist.upcomingShows || 0}
                />
              ))}
            </div>
          </section>
        )}
        
        {followedArtists.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Artists You Follow</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {followedArtists.slice(0, 15).map(artist => (
                <ArtistCard 
                  key={artist.id}
                  id={artist.id}
                  name={artist.name}
                  image={artist.image || artist.image_url}
                  upcomingShows={artist.upcoming_shows || artist.upcomingShows || 0}
                />
              ))}
            </div>
          </section>
        )}
      </>
    );
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Artists</h1>
        {renderContent()}
      </main>
      
      <Footer />
    </div>
  );
};

export default MyArtists;
