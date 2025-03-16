
import React from 'react';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import VotableSetlistTable from '@/components/setlist/VotableSetlistTable';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

interface Track {
  id: string;
  name: string;
}

interface ShowSetlistProps {
  setlist: Song[];
  handleVote: (songId: string) => void;
  availableTracks: Track[];
  isLoadingAllTracks: boolean;
  selectedTrack: string;
  setSelectedTrack: (trackId: string) => void;
  handleAddSong: () => void;
  isAuthenticated: boolean;
  login: () => void;
}

const ShowSetlist = ({
  setlist,
  handleVote,
  availableTracks,
  isLoadingAllTracks,
  selectedTrack,
  setSelectedTrack,
  handleAddSong,
  isAuthenticated,
  login
}: ShowSetlistProps) => {
  const handleTrackSelect = (value: string) => {
    setSelectedTrack(value);
  };
  
  const handleAddTrack = () => {
    if (!isAuthenticated) {
      toast.error("Please log in to add songs to the setlist", {
        action: {
          label: "Log in",
          onClick: login
        }
      });
      return;
    }
    
    handleAddSong();
  };
  
  // Truncate long song names
  const truncateSongName = (name: string, maxLength = 50) => {
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };
  
  return (
    <div className="flex flex-col">
      <VotableSetlistTable 
        songs={setlist} 
        onVote={handleVote} 
        className="animate-fade-in"
      />
      
      <div className="p-4 border-t border-border/40">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-grow w-full sm:w-auto">
            <p className="text-sm font-medium mb-1.5">Add a song to this setlist:</p>
            <Select
              value={selectedTrack}
              onValueChange={handleTrackSelect}
              disabled={isLoadingAllTracks || availableTracks.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a song" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingAllTracks ? (
                  <SelectItem value="loading" disabled>Loading songs...</SelectItem>
                ) : availableTracks.length === 0 ? (
                  <SelectItem value="empty" disabled>No songs available</SelectItem>
                ) : (
                  availableTracks.map((track) => (
                    <SelectItem key={track.id} value={track.id}>
                      {truncateSongName(track.name)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleAddTrack}
            disabled={!selectedTrack || isLoadingAllTracks}
            className="mt-2 sm:mt-0 flex-shrink-0"
            size="sm"
          >
            <PlusCircle size={16} className="mr-1.5" />
            Add to Setlist
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShowSetlist;
