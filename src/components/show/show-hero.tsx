"use client";

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar, Music, User, ExternalLink, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface ShowHeroProps {
  show: {
    id: string;
    date: string;
    name?: string;
    image_url?: string;
    artist: {
      id: string;
      name: string;
      image_url?: string;
    };
    venue: {
      id: string;
      name: string;
      city?: string;
      state?: string;
      country?: string;
    };
    external_url?: string;
  };
}

export function ShowHero({ show }: ShowHeroProps) {
  const imageUrl = show.image_url || show.artist.image_url || '/images/placeholder-show.jpg';
  const showDate = formatDate(show.date);
  const venueName = show.venue?.name || 'Venue TBA';
  const venueLocation = [show.venue?.city, show.venue?.state, show.venue?.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="relative">
      {/* Background image with overlay */}
      <div className="absolute inset-0 h-[300px] sm:h-[400px]">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={show.name || `${show.artist.name} show`}
            fill
            className="object-cover brightness-[0.3]"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="container relative z-10 pt-20 pb-12 sm:pb-16">
        <Button variant="outline" size="sm" className="mb-8" asChild>
          <Link href={`/artist/${show.artist.id}`} className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to Artist
          </Link>
        </Button>

        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* Show image */}
          <div className="relative h-[180px] w-[180px] overflow-hidden rounded-lg border shadow-lg">
            <Image
              src={imageUrl}
              alt={show.name || `${show.artist.name} show`}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Show details */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{show.artist.name}</h1>
              {show.name && (
                <p className="text-xl text-muted-foreground">{show.name}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>{showDate}</span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>{venueName}{venueLocation ? ` • ${venueLocation}` : ''}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {show.external_url && (
                <Button size="sm" asChild>
                  <Link 
                    href={show.external_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    Buy Tickets
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
              
              <Button size="sm" variant="secondary" asChild>
                <Link 
                  href={`/show/${show.id}/setlist`}
                  className="flex items-center gap-1"
                >
                  <Music className="h-4 w-4 mr-1" />
                  View Setlist
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 