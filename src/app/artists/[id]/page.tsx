import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import ArtistHeader from '@/components/artist/ArtistHeader';
import UpcomingShows from '@/components/artist/UpcomingShows';
import { Separator } from '@/components/ui/separator';
import PastSetlists from '@/components/artist/PastSetlists';
import ArtistStats from '@/app/components/ArtistStats';

// Import sync functions
import { syncArtist } from '@/app/actions/sync-actions';

interface ArtistPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata(
  { params }: ArtistPageProps
): Promise<Metadata> {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
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
    description: `Vote on songs you want to hear at upcoming shows for ${artist.name}.`,
    openGraph: {
      title: `${artist.name} | TheSet`,
      description: `Vote on songs you want to hear at upcoming shows for ${artist.name}.`,
      type: 'website',
    },
  };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
  // Fetch artist data
  const { data: artist } = await supabase
    .from('artists')
    .select('*')
    .eq('id', params.id)
    .single();
    
  if (!artist) {
    notFound();
  }
  
  // Sync the artist data (this will update shows and other information)
  try {
    await syncArtist(artist.id);
  } catch (error) {
    console.error('Error syncing artist:', error);
    // Continue with whatever data we have
  }
  
  // Fetch upcoming shows from the database
  const { data: upcomingShowsData } = await supabase
    .from('shows')
    .select(`
      id, 
      name, 
      date, 
      ticket_url, 
      image_url,
      venue:venues(
        id,
        name,
        city,
        state
      )
    `)
    .eq('artist_id', artist.id)
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true })
    .limit(10);
  
  // Transform the data to match the expected format for the UpcomingShows component
  const upcomingShows = upcomingShowsData ? upcomingShowsData.map(show => ({
    id: show.id,
    name: show.name,
    date: show.date,
    venue: show.venue ? {
      name: show.venue.name,
      city: show.venue.city,
      state: show.venue.state
    } : null,
    ticket_url: show.ticket_url,
    image_url: show.image_url
  })) : [];

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
        artistImage={artist.image_url}
        upcomingShowsCount={upcomingShows?.length || 0}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
        {/* Left content area */}
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