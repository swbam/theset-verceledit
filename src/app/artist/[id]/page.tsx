import { getArtistDetails, getArtistEvents } from '@/lib/ticketmaster';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { Calendar, Clock, MapPin, Music, Ticket } from 'lucide-react';
import { Event } from '@/types/artist';
import { format } from 'date-fns';

interface ArtistPageProps {
  params: {
    id: string;
  };
}

// Format date for display
function formatEventDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return format(date, 'EEEE, MMMM d, yyyy · h:mm a');
  } catch (e) {
    return dateString;
  }
}

// Loading component for events
function EventsLoading() {
  return (
    <div className="space-y-4 mt-6">
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className="animate-pulse rounded-lg bg-zinc-900 border border-zinc-800 p-4"
        >
          <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-zinc-800 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  );
}

// Event card component
function EventCard({ event }: { event: Event }) {
  const eventDate = event.date ? new Date(event.date) : null;
  
  return (
    <Link
      href={`/show/${event.id}`}
      className="block rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 transition-all hover:shadow-lg"
    >
      <div className="flex flex-col md:flex-row gap-4">
        {event.image && (
          <div className="relative w-full md:w-48 h-32 rounded-md overflow-hidden">
            <Image
              src={event.image}
              alt={event.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-2">{event.name}</h3>
          
          {eventDate && (
            <div className="flex items-center text-zinc-400 mb-1">
              <Calendar size={16} className="mr-2" />
              <span>{formatEventDate(event.date)}</span>
            </div>
          )}
          
          {event.venue && (
            <div className="flex items-center text-zinc-400 mb-1">
              <MapPin size={16} className="mr-2" />
              <span>
                {[
                  event.venue.name,
                  event.venue.city,
                  event.venue.state
                ].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          
          <div className="mt-3">
            <span className="inline-flex items-center py-1 px-3 bg-violet-900/30 text-violet-300 text-sm font-medium rounded-full">
              <Ticket size={14} className="mr-1" /> Get tickets
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Component to fetch and display upcoming events
async function ArtistEvents({ artistId }: { artistId: string }) {
  try {
    const events = await getArtistEvents(artistId);
    
    if (!events || events.length === 0) {
      return (
        <div className="text-center py-8 border rounded-lg border-dashed border-zinc-700 bg-zinc-900/50">
          <Music size={32} className="mx-auto text-zinc-500 mb-3" />
          <h3 className="text-xl font-medium mb-1">No upcoming shows</h3>
          <p className="text-zinc-400">
            Check back later for upcoming concerts
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 mt-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    );
  } catch (error) {
    console.error('Error fetching artist events:', error);
    return (
      <div className="text-center py-8 border rounded-lg border-dashed border-zinc-700 bg-zinc-900/50">
        <h3 className="text-xl font-medium mb-1">Error loading shows</h3>
        <p className="text-zinc-400">
          There was a problem loading upcoming shows. Please try again later.
        </p>
      </div>
    );
  }
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { id } = params;
  
  try {
    const artist = await getArtistDetails(id);
    
    if (!artist) {
      notFound();
    }
    
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Artist Image */}
          <div className="w-full md:w-1/3 lg:w-1/4">
            <div className="rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 aspect-square relative">
              {artist.image ? (
                <Image
                  src={artist.image}
                  alt={artist.name}
                  fill
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                  <Music size={64} className="text-zinc-600" />
                </div>
              )}
            </div>
          </div>
          
          {/* Artist Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{artist.name}</h1>
            
            {artist.genres && artist.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {artist.genres.map((genre) => (
                  <span 
                    key={genre}
                    className="py-1 px-3 bg-zinc-800 text-zinc-300 text-sm rounded-full"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
            
            {artist.ticketmasterUrl && (
              <a 
                href={artist.ticketmasterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-violet-400 hover:text-violet-300 transition-colors mb-6"
              >
                View on Ticketmaster ↗
              </a>
            )}
            
            <h2 className="text-2xl font-bold mb-4 border-b border-zinc-800 pb-2 mt-6">
              Upcoming Shows
            </h2>
            
            <Suspense fallback={<EventsLoading />}>
              <ArtistEvents artistId={id} />
            </Suspense>
          </div>
        </div>
      </main>
    );
  } catch (error) {
    console.error('Error fetching artist details:', error);
    notFound();
  }
} 