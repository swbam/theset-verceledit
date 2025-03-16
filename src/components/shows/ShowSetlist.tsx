
import React from 'react';
import { PlusCircle, Music } from 'lucide-react';
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
      
      <div className="p-4 border-t border-white/10">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-grow w-full sm:w-auto">
            <p className="text-sm font-medium mb-1.5 text-white/80">Add a song to this setlist:</p>
            <Select
              value={selectedTrack}
              onValueChange={handleTrackSelect}
              disabled={isLoadingAllTracks || availableTracks.length === 0}
            >
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select a song" />
              </SelectTrigger>
              <SelectContent className="bg-[#14141F] border-white/10 text-white">
                {isLoadingAllTracks ? (
                  <SelectItem value="loading" disabled>Loading songs...</SelectItem>
                ) : availableTracks.length === 0 ? (
                  <SelectItem value="empty" disabled>No songs available</SelectItem>
                ) : (
                  availableTracks.map((track) => (
                    <SelectItem key={track.id} value={track.id} className="focus:bg-blue-500/20 focus:text-white">
                      <div className="flex items-center">
                        <Music size={14} className="mr-2 text-white/60" />
                        {truncateSongName(track.name)}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleAddTrack}
            disabled={!selectedTrack || isLoadingAllTracks}
            className="mt-2 sm:mt-0 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
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
