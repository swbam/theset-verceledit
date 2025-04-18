// Import the createServerClient from @supabase/ssr
import { createServerClient, type CookieOptions } from '@supabase/ssr'; 
import { cookies } from 'next/headers';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import ArtistHeader from '@/components/artist/ArtistHeader';
import UpcomingShows from '@/components/artist/UpcomingShows';
import ArtistStats from '@/app/components/ArtistStats';
import { Separator } from '@/components/ui/separator';
import PastSetlists from '@/components/artist/PastSetlists';

interface ArtistPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata(
  { params }: ArtistPageProps
): Promise<Metadata> {
  // Use the createServerClient from @supabase/ssr
  const cookieStore = cookies(); // Get the cookie store
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // Ensure these are defined in your env
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No need for set/remove in read-only server component context usually
      },
    }
  );
  
  const { data: artist } = await supabase
    .from('artists')
    .select('name')
    .eq('id', params.id)
    .single();
    
  if (!artist) {
    return {
      title: 'Artist Not Found',
      description: 'The requested artist could not be found.'
    };
  }
  
  return {
    title: `${artist.name} | TheSet`,
    description: `View upcoming shows, past setlists, and statistics for ${artist.name}.`,
    openGraph: {
      title: `${artist.name} | TheSet`,
      description: `View upcoming shows, past setlists, and statistics for ${artist.name}.`,
      type: 'website',
    },
  };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  // Use the createServerClient from @supabase/ssr
  const cookieStore = cookies(); // Get the cookie store
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // Ensure these are defined in your env
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No need for set/remove in read-only server component context usually
      },
    }
  );
  
  const { data: artist } = await supabase
    .from('artists')
    .select('*')
    .eq('id', params.id)
    .single();
    
  if (!artist) {
    notFound();
  }
  
  // Fetch upcoming shows from Ticketmaster API
  const ticketmasterResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ticketmaster?endpoint=events.json&keyword=${encodeURIComponent(artist.name)}&sort=date,asc&size=5`);
  const ticketmasterData = await ticketmasterResponse.json();
  
  const upcomingShows = ticketmasterData._embedded?.events?.map((event: any) => ({
    id: event.id,
    name: event.name,
    date: event.dates.start.dateTime,
    venue: event._embedded?.venues?.[0] ? {
      name: event._embedded.venues[0].name,
      city: event._embedded.venues[0].city?.name,
      state: event._embedded.venues[0].state?.stateCode
    } : null,
    ticket_url: event.url,
    image_url: event.images?.[0]?.url
  })) || [];

  // Fetch past setlists
  const { data: pastSetlists } = await supabase
    .from('setlists')
    .select(`
      id,
      date,
      venue,
      venue_city,
      tour_name,
      songs:setlist_songs(*)
    `)
    .eq('artist_id', artist.id)
    .order('date', { ascending: false })
    .limit(10);

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <ArtistHeader
        artistName={artist.name}
        artistImage={artist.image_url} // Assuming image_url is the correct property
        upcomingShowsCount={upcomingShows?.length || 0}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
        {/* Left sidebar */}
        <div className="md:col-span-2 lg:col-span-3 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Upcoming Shows</h2>
            <UpcomingShows 
              shows={upcomingShows || []} 
              artistName={artist.name} 
              isLoading={false} 
            />
          </section>

          <Separator className="my-8" />
          
          <section>
            <h2 className="text-2xl font-bold mb-4">Past Setlists</h2>
            <PastSetlists 
              setlists={pastSetlists || []} 
              artistId={artist.id} 
              artistName={artist.name} 
            />
          </section>
        </div>
        
        {/* Right sidebar */}
        <div className="md:col-span-1 space-y-6">
          <ArtistStats artistId={artist.id} />
          
          {/* Additional sidebar components can be added here */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-medium mb-2">About TheSet</h3>
            <p className="text-sm text-muted-foreground">
              Vote on songs you want to hear at upcoming shows and see what others are voting for!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
