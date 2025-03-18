import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import { fetchArtistById } from '@/lib/api/artist';
import { syncArtistStatsToDatabase } from '@/lib/api/db/artist-utils';
import { getArtistTopTracks } from '@/lib/spotify';
import { fetchPastSetlists } from '@/lib/api/setlists';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ArtistHeader from '@/components/artist/ArtistHeader';
import UpcomingShows from '@/components/artist/UpcomingShows';
import ArtistDetailSkeleton from '@/components/artist/ArtistDetailSkeleton';
import ArtistNotFound from '@/components/artist/ArtistNotFound';
import ArtistStats from '@/components/artist/ArtistStats';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { Button } from '@/components/ui/button'; 
import { toast } from 'sonner';
import { SectionHeader } from '@/components/ui/section-header';
import PastSetlistCard from '@/components/artist/PastSetlistCard';
import { Artist, PastSetlist, Show, TopTrack } from '@/types/artist';
import { Skeleton } from '@/components/ui/skeleton';

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  
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
          toast.error("Failed to sync artist stats. Some information may be outdated.");
        });
    }
  }, [artist?.id, artist?.spotify_id, artist?.name]);
  
  // Fetch upcoming shows for this artist
  const {
    data: shows = [],
    isLoading: showsLoading,
    error: showsError
  } = useQuery<Show[]>({
    queryKey: ['artistEvents', id],
    queryFn: async () => {
      try {
        const allShows = await fetchArtistEvents(id as string);
        console.log(`Loaded ${allShows.length} shows for artist`);
        return allShows;
      } catch (error) {
        console.error("Error fetching artist events:", error);
        toast.error("Failed to load upcoming shows. Please try refreshing the page.");
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
    isLoading: tracksLoading,
    error: tracksError
  } = useQuery({
    queryKey: ['artistTopTracks', artist?.spotify_id],
    queryFn: () => getArtistTopTracks(artist?.spotify_id || ''),
    enabled: !!artist?.spotify_id,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Fetch past setlists for this artist
  const {
    data: pastSetlists = [],
    isLoading: pastSetlistsLoading,
    error: pastSetlistsError
  } = useQuery<PastSetlist[]>({
    queryKey: ['pastSetlists', id],
    queryFn: async () => {
      try {
        const setlists = await fetchPastSetlists(id as string);
        return setlists;
      } catch (error) {
        console.error("Error fetching past setlists:", error);
        toast.error("Failed to load past setlists");
        return [];
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 30, // 30 minutes
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
  const topTracks: TopTrack[] = topTracksData?.tracks?.slice(0, 5) || [];

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar />
      
      <main className="flex-grow">
        <ArtistHeader 
          artistName={artist.name} 
          artistImage={artist.image_url || artist.image}
          artistGenres={artist.genres || []}
          spotifyUrl={artist.spotify_id ? `https://open.spotify.com/artist/${artist.spotify_id}` : undefined}
          followers={artist.followers || 0}
          monthlyListeners={artist.monthly_listeners || 0}
        />
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left Column - Upcoming Shows */}
            <div className="w-full md:w-2/3">
              <h2 className="text-2xl font-bold mb-4">Upcoming Shows</h2>
              <p className="text-white/60 text-sm mb-6">
                Vote on setlists for upcoming {artist.name} shows
              </p>
              
              {shows.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
                  <p className="text-lg mb-3">No upcoming shows found</p>
                  <p className="text-white/60 text-sm mb-6">
                    We couldn't find any upcoming shows for {artist.name}
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/artists">Browse other artists</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {shows.map((show) => (
                    <div key={show.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                      <div className="flex flex-col">
                        <time className="text-white/60 text-sm mb-2">
                          {new Date(show.date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </time>
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3">
                          <div className="mb-3 sm:mb-0">
                            <h3 className="font-medium">{show.venue?.name || 'Unknown Venue'}</h3>
                            <div className="text-white/60 text-sm">
                              {show.venue?.city || ''}{show.venue?.state ? `, ${show.venue.state}` : ''}
                              {show.venue?.country && show.venue.country !== 'United States' ? `, ${show.venue.country}` : ''}
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/shows/${show.id}`}>Setlist</Link>
                            </Button>
                            
                            {show.ticket_url && (
                              <Button asChild size="sm">
                                <a href={show.ticket_url} target="_blank" rel="noopener noreferrer">
                                  Tickets
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Past Setlists Section */}
              {pastSetlists.length > 0 && (
                <div className="mt-10">
                  <h2 className="text-2xl font-bold mb-4">Past Setlists</h2>
                  <p className="text-white/60 text-sm mb-6">
                    Review what {artist.name} played at previous shows
                  </p>
                  
                  <div className="space-y-4">
                    {pastSetlists.slice(0, 3).map((setlist) => (
                      <div key={setlist.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                        <div className="flex flex-col">
                          <time className="text-white/60 text-sm mb-2">
                            {new Date(setlist.event_date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </time>
                          
                          <div className="mb-3">
                            <h3 className="font-medium">{setlist.venue?.name || 'Unknown Venue'}</h3>
                            <div className="text-white/60 text-sm">
                              {setlist.venue?.city || ''}{setlist.venue?.state ? `, ${setlist.venue.state}` : ''}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-4">
                            {setlist.songs.slice(0, 3).map((song) => (
                              <Badge key={song.id} variant="outline" className="bg-zinc-800">
                                {song.name}
                              </Badge>
                            ))}
                            {setlist.songs.length > 3 && (
                              <Badge variant="outline" className="bg-zinc-800">
                                +{setlist.songs.length - 3} more
                              </Badge>
                            )}
                          </div>
                          
                          <Button asChild variant="outline" size="sm" className="self-start">
                            <Link to={`/setlists/${setlist.id}`}>View full setlist</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {pastSetlists.length > 3 && (
                    <div className="mt-4 text-center">
                      <Button asChild variant="outline">
                        <Link to={`/artists/${id}/setlists`}>See all past setlists</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Right Column - Artist Stats */}
            <div className="w-full md:w-1/3">
              <ArtistStats 
                spotifyFollowers={artist.followers}
                monthlyListeners={artist.monthly_listeners}
                topTracks={topTracks}
                genres={artist.genres}
                formed={artist.formation_year?.toString()}
                origin={artist.origin}
                spotifyId={artist.spotify_id}
              />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ArtistDetail;
