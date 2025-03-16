
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Music2, CalendarDays, Users, ExternalLink, ArrowLeft } from 'lucide-react';
import { getArtistDetails, getArtistTopTracks } from '@/lib/spotify';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ShowCard from '@/components/shows/ShowCard';

const ArtistDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  // Fetch artist details from Spotify
  const { 
    data: artist, 
    isLoading: isLoadingArtist, 
    error: artistError 
  } = useQuery({
    queryKey: ['artist', id],
    queryFn: () => getArtistDetails(id!),
    enabled: !!id,
  });
  
  // Fetch artist's top tracks from Spotify
  const { 
    data: topTracksData
  } = useQuery({
    queryKey: ['artistTopTracks', id],
    queryFn: () => getArtistTopTracks(id!),
    enabled: !!id,
  });
  
  // Fetch upcoming shows from Ticketmaster
  const {
    data: events,
    isLoading: isLoadingEvents,
  } = useQuery({
    queryKey: ['artistEvents', artist?.name],
    queryFn: () => fetchArtistEvents(artist?.name || ''),
    enabled: !!artist?.name,
  });
  
  const topTracks = topTracksData?.tracks || [];
  const upcomingShows = events || [];
  
  if (isLoadingArtist) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-48 h-48 rounded-xl bg-secondary"></div>
                <div className="space-y-4 flex-1">
                  <div className="h-10 bg-secondary rounded w-1/3"></div>
                  <div className="h-5 bg-secondary rounded w-1/4"></div>
                  <div className="h-4 bg-secondary rounded w-1/2 mt-4"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (artistError || !artist) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Artist not found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find the artist you're looking for.
            </p>
            <Link to="/search" className="text-primary hover:underline flex items-center justify-center">
              <ArrowLeft size={16} className="mr-2" />
              Back to search
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Artist header section */}
        <section className="px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto">
            <Link to="/search" className="text-muted-foreground hover:text-foreground inline-flex items-center mb-6 transition-colors">
              <ArrowLeft size={16} className="mr-2" />
              Back to search
            </Link>
            
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-48 h-48 rounded-xl overflow-hidden bg-secondary shadow-sm">
                {artist.images && artist.images[0] ? (
                  <img 
                    src={artist.images[0].url} 
                    alt={artist.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Music2 size={64} className="text-foreground/20" />
                  </div>
                )}
              </div>
              
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{artist.name}</h1>
                
                {artist.genres && artist.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {artist.genres.slice(0, 5).map((genre: string) => (
                      <span key={genre} className="inline-block text-xs bg-secondary px-2 py-1 rounded-full">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-6 mt-6">
                  <div className="flex items-center">
                    <Users size={16} className="text-muted-foreground mr-2" />
                    <span className="text-sm">{artist.followers.total.toLocaleString()} followers</span>
                  </div>
                  
                  {artist.external_urls?.spotify && (
                    <a 
                      href={artist.external_urls.spotify} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center transition-colors"
                    >
                      <ExternalLink size={14} className="mr-1" />
                      Spotify
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Upcoming shows section */}
        <section className="px-6 md:px-8 lg:px-12 py-12 bg-secondary/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Upcoming Shows</h2>
                <p className="text-muted-foreground mt-1">Vote on setlists for upcoming shows</p>
              </div>
            </div>
            
            {isLoadingEvents ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-64 rounded-xl animate-pulse bg-background border border-border"></div>
                ))}
              </div>
            ) : upcomingShows.length === 0 ? (
              <div className="text-center p-12 border border-border rounded-xl bg-background">
                <CalendarDays className="mx-auto mb-4 text-muted-foreground h-10 w-10" />
                <h3 className="text-xl font-medium mb-2">No upcoming shows</h3>
                <p className="text-muted-foreground">
                  Check back later for announced concerts
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingShows.map((show: any, index: number) => (
                  <div 
                    key={show.id} 
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <ShowCard 
                      show={{
                        id: show.id,
                        name: show.name,
                        date: show.date,
                        image_url: show.image_url,
                        venue: show.venue,
                        artist: { name: artist.name }
                      }} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        
        {/* Top tracks section */}
        <section className="px-6 md:px-8 lg:px-12 py-12">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Top Tracks</h2>
            
            {topTracks.length === 0 ? (
              <div className="text-center p-12 border border-border rounded-xl">
                <Music2 className="mx-auto mb-4 text-muted-foreground h-10 w-10" />
                <h3 className="text-xl font-medium mb-2">No tracks available</h3>
                <p className="text-muted-foreground">
                  Top tracks information is not available at this time
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="py-3 px-4 text-left">#</th>
                        <th className="py-3 px-4 text-left">Track</th>
                        <th className="py-3 px-4 text-right">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topTracks.map((track: any, index: number) => (
                        <tr 
                          key={track.id} 
                          className={cn(
                            "border-b border-border",
                            "hover:bg-secondary/30 transition-colors",
                            index === topTracks.length - 1 && "border-b-0"
                          )}
                        >
                          <td className="py-3 px-4 text-muted-foreground">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{track.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {track.album.name}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {track.external_urls?.spotify && (
                              <a 
                                href={track.external_urls.spotify} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center transition-colors"
                              >
                                <ExternalLink size={14} className="ml-1" />
                                <span className="sr-only">Open in Spotify</span>
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ArtistDetail;
