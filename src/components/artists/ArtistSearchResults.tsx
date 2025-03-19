
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchArtistsWithEvents } from '@/lib/api/artist';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ArtistSearchResultsProps {
  query: string;
  onSelect?: (artist: any) => void;
}

const ArtistSearchResults = ({ query, onSelect }: ArtistSearchResultsProps) => {
  const navigate = useNavigate();
  
  const { data: artists = [], isLoading } = useQuery({
    queryKey: ['artistSearch', query],
    queryFn: () => searchArtistsWithEvents(query),
    enabled: query.length > 2,
    onError: (error) => {
      console.error("Artist search error:", error);
      toast.error("Failed to search for artists. Please try again.");
    }
  });

  if (!query || query.length <= 2) {
    return (
      <div className="bg-background rounded-xl shadow-lg border border-border p-4">
        <p className="text-muted-foreground text-sm">Enter at least 3 characters to search</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-background rounded-xl shadow-lg border border-border p-4 space-y-3">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24 mt-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className="bg-background rounded-xl shadow-lg border border-border p-4">
        <p className="text-muted-foreground text-sm">No artists found with upcoming shows</p>
      </div>
    );
  }

  const handleArtistClick = (artist: any) => {
    console.log("Artist selected:", artist); // Log the selected artist
    if (onSelect) {
      onSelect(artist);
    } else {
      // Show success message when an artist is selected
      toast.success(`Viewing ${artist.name}`);
      navigate(`/artists/${artist.id}`);
    }
  };

  return (
    <div className="bg-background rounded-xl shadow-lg border border-border overflow-hidden">
      <div className="max-h-80 overflow-y-auto">
        {artists.map((artist) => (
          <div
            key={artist.id}
            onClick={() => handleArtistClick(artist)}
            className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-0 cursor-pointer"
          >
            <Avatar className="h-10 w-10">
              {artist.image ? (
                <img src={artist.image} alt={artist.name} />
              ) : (
                <div className="bg-primary/10 h-full w-full flex items-center justify-center text-primary font-medium">
                  {artist.name.charAt(0)}
                </div>
              )}
            </Avatar>
            <div>
              <h4 className="font-medium text-sm">{artist.name}</h4>
              <p className="text-xs text-muted-foreground">
                {artist.upcomingShows} upcoming {artist.upcomingShows === 1 ? 'show' : 'shows'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArtistSearchResults;
