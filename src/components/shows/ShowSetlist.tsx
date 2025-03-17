
import React from 'react';
import { PlusCircle, Disc3 } from 'lucide-react';
import { toast } from 'sonner';
import VotableSetlistTable from '@/components/setlist/VotableSetlistTable';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select';

interface Song {
  id: string;
  name: string;
  votes: number;
  userVoted: boolean;
}

interface Track {
  id: string;
  name: string;
  album?: string;
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
    handleAddSong();
  };
  
  // Truncate long song names
  const truncateSongName = (name: string, maxLength = 50) => {
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };
  
  // Group tracks by album
  const tracksByAlbum = React.useMemo(() => {
    const albums: Record<string, Track[]> = {};
    
    if (!availableTracks) return albums;
    
    availableTracks.forEach(track => {
      const albumName = track.album || 'Other Songs';
      if (!albums[albumName]) {
        albums[albumName] = [];
      }
      albums[albumName].push(track);
    });
    
    // Sort albums by popularity of first track in each album
    return Object.entries(albums)
      .sort((a, b) => {
        const aPopularity = a[1][0]?.popularity || 0;
        const bPopularity = b[1][0]?.popularity || 0;
        return bPopularity - aPopularity;
      })
      .reduce((acc, [album, tracks]) => {
        acc[album] = tracks;
        return acc;
      }, {} as Record<string, Track[]>);
  }, [availableTracks]);
  
  return (
    <div className="flex flex-col">
      {/* Song selection dropdown at the top */}
      <div className="p-4 border-b border-white/10 mb-2">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-white/80">Add a song to this setlist:</p>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-grow w-full sm:w-auto">
              <Select
                value={selectedTrack}
                onValueChange={handleTrackSelect}
                disabled={isLoadingAllTracks}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select a song" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A16] border-white/10 text-white z-50 max-h-80">
                  {isLoadingAllTracks ? (
                    <SelectItem value="loading" disabled>Loading songs...</SelectItem>
                  ) : availableTracks.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      <div className="text-center py-2 text-white/60">
                        No songs available. We'll add some default tracks soon!
                      </div>
                    </SelectItem>
                  ) : (
                    Object.entries(tracksByAlbum).map(([album, tracks]) => (
                      <SelectGroup key={album}>
                        <SelectLabel className="px-2 text-xs font-semibold text-white/50">
                          <Disc3 size={12} className="inline mr-1" /> {album}
                        </SelectLabel>
                        {tracks
                          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                          .map((track) => (
                            <SelectItem key={track.id} value={track.id} className="focus:bg-white/10 focus:text-white">
                              {truncateSongName(track.name)}
                            </SelectItem>
                          ))
                        }
                      </SelectGroup>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleAddTrack}
              disabled={isLoadingAllTracks || !availableTracks.length}
              className="mt-2 sm:mt-0 flex-shrink-0 bg-white text-[#0A0A16] hover:bg-white/90" 
              size="sm"
            >
              <PlusCircle size={16} className="mr-1.5" />
              Add to Setlist
            </Button>
          </div>
        </div>
      </div>
      
      <VotableSetlistTable 
        songs={setlist} 
        onVote={handleVote} 
        className="animate-fade-in"
        anonymousVoteCount={anonymousVoteCount}
      />
    </div>
  );
};

export default ShowSetlist;
