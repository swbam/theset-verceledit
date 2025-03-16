
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { fetchShowsByGenre } from '@/lib/ticketmaster';
import ShowCard from '@/components/shows/ShowCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ShowsByGenreProps {
  genreId: string;
  genreName: string;
}

const ShowsByGenre = ({ genreId, genreName }: ShowsByGenreProps) => {
  const { data: shows = [], isLoading, error } = useQuery({
    queryKey: ['showsByGenre', genreId],
    queryFn: () => fetchShowsByGenre(genreId),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array(4).fill(0).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || shows.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{genreName}</h2>
          <p className="text-muted-foreground">Upcoming {genreName} shows</p>
        </div>
        <Button variant="ghost" className="mt-2 sm:mt-0 group" asChild>
          <div className="flex items-center">
            See all {genreName} shows
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {shows.map((show, index) => (
          <div
            key={show.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <ShowCard show={show} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ShowsByGenre;
