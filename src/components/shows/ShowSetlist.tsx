
import React from 'react';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import VotableSetlistTable from '@/components/setlist/VotableSetlistTable';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
} from '@/components/ui/select';

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
  albumName?: string;
  albumImageUrl?: string;
  artistName?: string;
}

interface Track {
  id: string;
  name: string;
  album?: {
    name?: string;
    images?: { url: string }[];
  };
  artists?: { name: string }[];
  popularity?: number;
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
  anonymousVoteCount?: number;
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
  login,
  anonymousVoteCount = 0
}: ShowSetlistProps) => {
  const isMobile = useIsMobile();
  
  const handleTrackSelect = (value: string) => {
    setSelectedTrack(value);
  };
  
  const handleAddTrack = () => {
    if (!selectedTrack) {
      toast.error("Please select a song first", {
        style: { background: "#14141F", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }
      });
      return;
    }
    
    // Call the handleAddSong function from the parent component
    handleAddSong();
    console.log("Add song triggered with track:", selectedTrack);
  };
  
  // Truncate long song names
  const truncateSongName = (name: string, maxLength = 50) => {
    return name && name.length > maxLength ? `${name.substring(0, maxLength)}...` : (name || 'Unknown Track');
  };
  
  // Sort tracks alphabetically by name and filter duplicates
  const sortedTracks = React.useMemo(() => {
    console.log("Sorting available tracks:", availableTracks?.length);
    if (!availableTracks || !Array.isArray(availableTracks) || availableTracks.length === 0) {
      // Return some mock tracks if no tracks are available
      return Array.from({ length: 10 }, (_, i) => ({
        id: `mock-select-${i}`,
        name: `Song Option ${i + 1}`
      }));
    }
    
    // Filter out duplicates by name (case-insensitive) and invalid tracks
    const uniqueNames = new Set();
    const uniqueTracks = availableTracks.filter(track => {
      if (!track || !track.name) return false;
      const lowercaseName = track.name.toLowerCase();
      if (uniqueNames.has(lowercaseName)) return false;
      uniqueNames.add(lowercaseName);
      return true;
    });
    
    // Sort alphabetically by name
    return [...uniqueTracks].sort((a, b) => 
      (a.name || '').localeCompare((b.name || ''), undefined, { sensitivity: 'base' })
    );
  }, [availableTracks]);
  
  // Process setlist items to ensure they have proper names
  const processedSetlist = React.useMemo(() => {
    return setlist.map(song => {
      // Ensure song has a proper name, not "Popular Song X"
      if (!song.name || song.name.startsWith('Popular Song')) {
        // Find the matching track in availableTracks if possible
        const matchingTrack = availableTracks?.find(track => track.id === song.id);
        if (matchingTrack?.name) {
          return {
            ...song,
            name: matchingTrack.name
          };
        }
        // Provide a better fallback name
        return {
          ...song,
          name: `Track ${song.id.substring(0, 6)}`
        };
      }
      return song;
    });
  }, [setlist, availableTracks]);
  
  return (
    <div className="flex flex-col">
      {/* Song selection dropdown at the top */}
      <div className={`${isMobile ? 'p-3' : 'p-4'} border-b border-white/10 mb-0`}>
        <div className="flex flex-col gap-2">
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white/80`}>
            Add a song to this setlist:
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-grow w-full sm:w-auto">
              <Select
                value={selectedTrack}
                onValueChange={handleTrackSelect}
                disabled={isLoadingAllTracks}
              >
                <SelectTrigger className="w-full bg-black border-white/10 text-white">
                  <SelectValue placeholder="Select a song" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A16] border-white/10 text-white z-50 max-h-80 min-w-[200px]">
                  {isLoadingAllTracks ? (
                    <SelectItem value="loading" disabled className="text-white/60">Loading songs...</SelectItem>
                  ) : sortedTracks.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      <div className="text-center py-2 text-white/60">
                        No songs available. We'll add some default tracks soon!
                      </div>
                    </SelectItem>
                  ) : (
                    sortedTracks.map((track) => (
                      <SelectItem 
                        key={track.id} 
                        value={track.id} 
                        className="focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
                      >
                        {truncateSongName(track.name)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleAddTrack}
              disabled={isLoadingAllTracks || !selectedTrack}
              className="mt-1 sm:mt-0 flex-shrink-0 bg-white text-[#0A0A16] hover:bg-white/90" 
              size={isMobile ? "sm" : "default"}
            >
              <PlusCircle size={isMobile ? 14 : 16} className="mr-1.5" />
              {isMobile ? "Add" : "Add to Setlist"}
            </Button>
          </div>
        </div>
      </div>
      
      <VotableSetlistTable 
        songs={processedSetlist} 
        onVote={handleVote} 
        className="animate-fade-in"
        anonymousVoteCount={anonymousVoteCount}
      />
    </div>
  );
};

export default ShowSetlist;
