'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, CalendarIcon, MapPinIcon, Clock, TagIcon } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatVenue } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ShowDetailClientProps {
  show: {
    id: string;
    title: string;
    description?: string;
    image_url?: string;
    start_date: string;
    end_date?: string;
    venue_name: string;
    venue_city: string;
    venue_state: string;
    genre: string;
    artist_name?: string;
    artist_image?: string;
  };
}

export default function ShowDetailClient({ show }: ShowDetailClientProps) {
  const [selectedTab, setSelectedTab] = useState('details');

  return (
    <div className="min-h-screen">
      <div className="relative">
        {/* Hero section with image */}
        <div className="relative h-[300px] md:h-[400px] w-full">
          {show.image_url ? (
            <Image 
              src={show.image_url} 
              alt={show.title} 
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">No image available</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <Link href="/shows">
            <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Shows
            </Button>
          </Link>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <div className="bg-card rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-start gap-4 mb-6">
            {show.artist_image ? (
              <Avatar className="h-16 w-16 border">
                <AvatarImage src={show.artist_image} alt={show.artist_name || 'Artist'} />
                <AvatarFallback>{show.artist_name?.substring(0, 2).toUpperCase() || 'A'}</AvatarFallback>
              </Avatar>
            ) : null}
            
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold">{show.title}</h1>
              {show.artist_name && (
                <p className="text-muted-foreground text-lg">by {show.artist_name}</p>
              )}
              <Badge variant="secondary" className="mt-2">{show.genre}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p>{formatDate(show.start_date, true)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Venue</p>
                <p>{formatVenue(show.venue_name, show.venue_city, show.venue_state)}</p>
              </div>
            </div>
            {show.end_date && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p>{formatDate(show.end_date)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Genre</p>
                <p>{show.genre}</p>
              </div>
            </div>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="setlist">Setlist</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="pt-4">
              <h2 className="text-xl font-semibold mb-2">About this show</h2>
              {show.description ? (
                <p className="text-muted-foreground">{show.description}</p>
              ) : (
                <p className="text-muted-foreground">No description available for this show.</p>
              )}
              
              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Venue Information</h2>
                <div className="p-4 bg-muted rounded-md">
                  <h3 className="font-medium">{show.venue_name}</h3>
                  <p className="text-muted-foreground">
                    {show.venue_city}, {show.venue_state}
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="setlist" className="pt-4">
              <h2 className="text-xl font-semibold mb-4">Setlist</h2>
              <div className="p-6 border border-dashed rounded-md text-center">
                <p className="text-muted-foreground">Setlist information will be available closer to the show date.</p>
                <Button variant="secondary" className="mt-4">Request Songs</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 