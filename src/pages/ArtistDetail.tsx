import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import { fetchArtistById } from '@/lib/api/artist';
import { syncArtistStatsToDatabase } from '@/lib/api/db/artist-utils';
import { getArtistTopTracks } from '@/lib/spotify';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ArtistHeader from '@/components/artist/ArtistHeader';
import UpcomingShows from '@/components/artist/UpcomingShows';
import ArtistDetailSkeleton from '@/components/artist/ArtistDetailSkeleton';
import ArtistNotFound from '@/components/artist/ArtistNotFound';
import ArtistStats from '@/components/artist/ArtistStats';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { Calendar, MapPin, ChevronRight, Music } from 'lucide-react';
import { Button } from '@/components/ui/button'; 
import { toast } from 'sonner';
import { SectionHeader } from '@/components/ui/section-header';
import PastSetlistCard from '@/components/artist/PastSetlistCard';

// Mock past setlists data to display in the UI
const MOCK_PAST_SETLISTS = [
  {
    id: 'past-1',
    date: '2023-04-05',
    venue: { name: 'Sphere', city: 'Las Vegas', state: 'Nevada' },
    songs: ['Yellow', 'The Scientist', 'Viva La Vida']
  },
  {
    id: 'past-2',
    date: '2023-04-06',
    venue: { name: 'Sphere', city: 'Las Vegas', state: 'Nevada' },
    songs: ['Paradise', 'Fix You', 'Clocks']
  },
  {
    id: 'past-3',
    date: '2023-04-09',
    venue: { name: 'Sphere', city: 'Las Vegas', state: 'Nevada' },
    songs: ['A Sky Full of Stars', 'Adventure of a Lifetime', 'Higher Power']
  }
];

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [pastSetlists, setPastSetlists] = useState(MOCK_PAST_SETLISTS);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  
  // Fetch artist details
  const {
    data: artist,
    isLoading: artistLoading,
    error: artistError
  } = useQuery({
    queryKey: ['artist', id],
    queryFn: () => fetchArtistById(id as string),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1
  });
  
  // Sync artist stats to database when data is loaded
  useEffect(() => {
    if (artist?.id && artist?.spotify_id) {
      // Trigger sync in the background
      syncArtistStatsToDatabase(artist.id, artist.spotify_id)
        .then(success => {
          if (success) {
            console.log(`Successfully synced stats for ${artist.name}`);
          }
        })
        .catch(error => {
          console.error("Error syncing artist stats:", error);
        });
    }
  }, [artist?.id, artist?.spotify_id, artist?.name]);
  
  // Fetch upcoming shows for this artist
  const {
    data: shows = [],
    isLoading: showsLoading,
    error: showsError
  } = useQuery({
    queryKey: ['artistEvents', id],
    queryFn: async () => {
      try {
        const allShows = await fetchArtistEvents(id as string);
        console.log(`Loaded ${allShows.length} shows for artist`);
        return allShows;
      } catch (error) {
        console.error("Error fetching artist events:", error);
        toast.error("Failed to load shows");
        return [];
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1
  });
  
  // Fetch artist's top tracks from Spotify
  const {
    data: topTracksData,
    isLoading: tracksLoading
  } = useQuery({
    queryKey: ['artistTopTracks', artist?.spotify_id],
    queryFn: () => getArtistTopTracks(artist?.spotify_id || ''),
    enabled: !!artist?.spotify_id,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Set document title
  useDocumentTitle(
    artist?.name || 'Artist',
    artist?.name ? `View upcoming concerts and vote on setlists for ${artist.name}` : undefined
  );
  
  const isLoading = artistLoading || showsLoading;
  const error = artistError || showsError;
  
  if (isLoading) {
    return <ArtistDetailSkeleton />;
  }

  if (error || !id || !artist) {
    console.error("Artist detail error:", error);
    return <ArtistNotFound />;
  }

  // Prepare top tracks for display
  const topTracks = topTracksData?.tracks?.slice(0, 5) || [];

  // Format date for past setlists
  const formatDateCompact = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar />
      
      <main className="flex-grow">
        <ArtistHeader 
          artistName={artist.name} 
          artistImage={artist.image}
          artistGenres={artist.genres || []}
          spotifyUrl={artist.spotify_id ? `https://open.spotify.com/artist/${artist.spotify_id}` : undefined}
          followers={artist.followers || 0}
          monthlyListeners={artist.monthly_listeners || 0}
        />
        
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main content - Upcoming Shows & Past Setlists */}
            <div className="lg:w-[70%]">
              {/* Upcoming Shows Section */}
              <div className="mb-12">
                <SectionHeader
                  title="Upcoming Shows"
                  subtitle={`Vote on setlists for upcoming ${artist.name} concerts`}
                  actionLink={shows.length > 4 ? `/shows?artist=${encodeURIComponent(artist.name)}` : undefined}
                  actionText="See all shows"
                  count={shows.length > 4 ? shows.length : undefined}
                />
                
                <UpcomingShows 
                  shows={shows.slice(0, 4)}
                  artistName={artist.name}
                />
              </div>
              
              {/* Past Setlists section */}
              <div>
                <SectionHeader
                  title="Past Setlists"
                  subtitle={`Review what ${artist.name} played at previous concerts`}
                  actionLink={pastSetlists.length > 3 ? `/artists/${id}/past-setlists` : undefined}
                  actionText="See all setlists"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pastSetlists.map((setlist) => (
                    <PastSetlistCard key={setlist.id} setlist={setlist} />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Sidebar - Artist Stats & Spotify */}
            <div className="lg:w-[30%] space-y-6">
              <ArtistStats 
                artist={artist}
                topTracks={topTracks}
              />
              
              {/* Spotify Connect Section */}
              <div className="bg-zinc-900 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-4">
                  <svg viewBox="0 0 24 24" width="24" height="24" className="text-green-500">
                    <path 
                      fill="currentColor" 
                      d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold">Spotify Integration</h3>
                </div>
                <p className="text-zinc-400 mb-5">
                  {artist.spotify_id 
                    ? `Get personalized recommendations and track stats for ${artist.name} by connecting your Spotify account.`
                    : `Connect your Spotify account to unlock personalized features for ${artist.name}.`
                  }
                </p>
                
                <div className="flex space-x-3">
                  {artist.spotify_id && (
                    <Button variant="outline" asChild className="flex-1 bg-zinc-800/50 border-zinc-700">
                      <a 
                        href={`https://open.spotify.com/artist/${artist.spotify_id}`} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center"
                      >
                        <Music className="mr-2 h-4 w-4" />
                        Open in Spotify
                      </a>
                    </Button>
                  )}
                  
                  <Button variant="default" asChild className="flex-1 bg-green-600 hover:bg-green-700">
                    <a href="/connect-spotify" className="inline-flex items-center justify-center">
                      Connect Account
                    </a>
                  </Button>
                </div>
                
                <p className="text-xs text-zinc-500 text-center mt-4">
                  Already connected? <a href="/my-artists" className="text-zinc-300 hover:underline">View your stats</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ArtistDetail;
