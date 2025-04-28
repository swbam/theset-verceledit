import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { popularMusicGenres } from '@/lib/ticketmaster';
import { formatDate, formatVenue } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, MapPinIcon } from "lucide-react";

interface Show {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  venue_name: string;
  venue_city: string;
  venue_state: string;
  genre: string;
  image_url?: string;
}

async function getUpcomingShows() {
  const { data, error } = await supabase
    .from("shows")
    .select("*")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Show[];
}

const UpcomingShows = () => {
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  
  const { data: shows, isLoading, error } = useQuery({
    queryKey: ["upcoming-shows"],
    queryFn: getUpcomingShows,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  const genres = shows ? Array.from(new Set(shows.map(show => show.genre))) : [];
  const filteredShows = shows ? 
    (selectedGenre === "all" ? shows : shows.filter(show => show.genre === selectedGenre)) : 
    [];

  if (error) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-bold mb-6">Upcoming Shows</h2>
        <div className="text-red-500 p-4 rounded-md bg-red-50">
          Error loading shows: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-2xl font-bold">Upcoming Shows</h2>
        {!isLoading && genres.length > 0 && (
          <div className="mt-2 md:mt-0">
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genres.map(genre => (
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredShows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShows.map((show) => (
            <Link key={show.id} href={`/show/${show.id}`} className="group">
              <Card className="h-full overflow-hidden transition-transform hover:scale-[1.02]">
                <div className="h-48 relative">
                  {show.image_url ? (
                    <img 
                      src={show.image_url} 
                      alt={show.title} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">No image</span>
                    </div>
                  )}
                  <div className="absolute top-0 right-0 bg-black/70 text-white px-3 py-1 m-2 text-sm rounded">
                    {show.genre}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                    {show.title}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    <span>{formatDate(show.start_date)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    <span>{formatVenue(show.venue_name, show.venue_city, show.venue_state)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500">No shows found for the selected genre.</p>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/shows" className="text-primary hover:underline">
          View all shows →
        </Link>
      </div>
    </div>
  );
};

export default UpcomingShows;
