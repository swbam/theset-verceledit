import { Suspense } from 'react';
import { ArrowRight, Music } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import TopVotedSongs from '@/app/components/TopVotedSongs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Show, PopularArtist } from '@/lib/types';
import { getTrendingShows, getPopularArtists } from '@/lib/api/database/shows';

export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch both popular artists and trending shows
  const [popularArtists, shows] = await Promise.all([
    getPopularArtists(),
    getTrendingShows()
  ]);

  return (
    <main className="container max-w-screen-xl mx-auto py-8 px-4">
      {/* Hero Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            <span className="text-gradient">Crowdsourced</span> Concert Setlists,{' '}
            <span className="text-gradient">
              <i>at scale</i>
            </span>
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Discover upcoming shows and vote on setlists for your favorite artists. Let them know what you want to hear, while they keep creative control.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg" className="btn-primary">
              <Link href="/explore">
                Explore Shows
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="btn-outline">
              <Link href="/how-it-works">How It Works</Link>
            </Button>
          </div>
        </div>
        
        <div className="hidden md:block">
          <Suspense fallback={<div className="animate-pulse bg-gray-200 rounded-xl h-full"></div>}>
            <img 
              src="/images/concert.jpg" 
              alt="Concert crowd" 
              className="w-full h-full object-cover rounded-xl shadow-lg"
            />
          </Suspense>
        </div>
      </section>
      
      {/* Personalized Recommendations */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="border border-white/10 rounded-xl bg-black/30 p-8 text-center flex flex-col items-center">
            <Music className="h-10 w-10 text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">Personalized Recommendations</h2>
            <p className="text-white/70 mb-6 max-w-lg">
              Connect your Spotify account to get personalized artist recommendations and upcoming shows.
            </p>
            <Button 
              asChild
              className="bg-white text-black hover:bg-white/90 flex items-center gap-2"
            >
              <Link href="/api/auth/spotify">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" fill="#1DB954"/>
                  <path d="M16.7917 17.3333C16.625 17.3333 16.4583 17.2917 16.3333 17.1667C15.125 16.375 13.625 15.9167 12.0417 15.9167C10.5417 15.9167 9.125 16.3333 8.08333 16.9583C7.75 17.1667 7.33333 17.0833 7.125 16.7917C6.91667 16.4583 7 16.0417 7.29167 15.8333C8.58333 15.0833 10.25 14.5833 12.0417 14.5833C13.9167 14.5833 15.6667 15.125 17.125 16.0833C17.4583 16.2917 17.5417 16.7083 17.3333 17.0417C17.2083 17.25 17 17.3333 16.7917 17.3333ZM18.0417 14.5C17.875 14.5 17.7083 14.4583 17.5833 14.3333C16.125 13.375 14.1667 12.8333 12.0833 12.8333C10.0833 12.8333 8.20833 13.3333 6.83333 14.1667C6.5 14.375 6.08333 14.2917 5.875 13.9583C5.66667 13.625 5.75 13.2083 6.08333 13C7.66667 12.0417 9.83333 11.5 12.0833 11.5C14.4583 11.5 16.7083 12.125 18.4167 13.25C18.75 13.4583 18.8333 13.875 18.625 14.2083C18.5 14.4167 18.2917 14.5 18.0417 14.5ZM19.375 11.25C19.2083 11.25 19.0417 11.2083 18.9167 11.0833C17.2083 9.95833 14.75 9.33333 12.125 9.33333C9.58333 9.33333 7.16667 9.91667 5.25 11C4.91667 11.2083 4.5 11.125 4.29167 10.7917C4.08333 10.4583 4.16667 10.0417 4.5 9.83333C6.66667 8.625 9.33333 8 12.125 8C15.0417 8 17.7917 8.70833 19.7917 10C20.125 10.2083 20.2083 10.625 20 10.9583C19.875 11.1667 19.625 11.25 19.375 11.25Z" fill="white"/>
                </svg>
                Connect Spotify
              </Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Top Songs & Popular Artists */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2">
          <TopVotedSongs limit={10} />
        </div>
        
        <div>
          <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Popular Artists</CardTitle>
            </CardHeader>
            <CardContent>
              {popularArtists.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No artists yet</p>
              ) : (
                <ul className="space-y-3">
                  {popularArtists.map((artist: PopularArtist, index) => (
                    <li key={artist.artist_id} className="group">
                      <Link
                        href={`/artists/${artist.artist_id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-medium">
                          {index + 1}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-primary transition-colors">
                            {artist.artist_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {artist.total_votes} votes • {artist.unique_voters} fans
                          </p>
                        </div>
                        
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      
      {/* Trending Shows Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Trending Shows</h2>
        {shows.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No trending shows available right now.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shows.map((show: Show) => (
              <Link key={show.id} href={`/show/${show.id}`} className="block group">
                <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
                  {show.artists?.image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img 
                        src={show.artists.image_url} 
                        alt={show.artists?.name || 'Show image'} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardHeader className="flex-grow">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {show.artists?.name || 'Unknown Artist'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {show.artists?.name || 'Unknown Artist'}
                    </p>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>{show.venues?.name || 'Unknown Venue'}</p>
                    <p>{show.venues?.city}{show.venues?.state ? `, ${show.venues.state}` : ''}</p>
                    <p>{show.date ? new Date(show.date).toLocaleDateString() : 'Date TBD'}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
      
      {/* How It Works Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 bg-primary/10 text-primary rounded-full mb-4">
              1
            </div>
            <h3 className="text-lg font-medium mb-2">Find Your Artist</h3>
            <p className="text-gray-600">
              Search for your favorite artists to see their upcoming concerts and shows.
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 bg-primary/10 text-primary rounded-full mb-4">
              2
            </div>
            <h3 className="text-lg font-medium mb-2">Vote on Songs</h3>
            <p className="text-gray-600">
              Browse the artist's catalog and vote for the songs you want to hear live.
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center h-12 w-12 bg-primary/10 text-primary rounded-full mb-4">
              3
            </div>
            <h3 className="text-lg font-medium mb-2">Discover New Music</h3>
            <p className="text-gray-600">
              See what songs other fans are voting for and discover new music.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
} 