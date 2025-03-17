
import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import SongSelector from './SongSelector';

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

interface SetlistAddSongFormProps {
  availableTracks: Track[];
  isLoadingAllTracks: boolean;
  selectedTrack: string;
  setSelectedTrack: (trackId: string) => void;
  handleAddSong: () => void;
}

const SetlistAddSongForm = ({
  availableTracks,
  isLoadingAllTracks,
  selectedTrack,
  setSelectedTrack,
  handleAddSong
}: SetlistAddSongFormProps) => {
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

  return (
    <div className={`${isMobile ? 'p-3' : 'p-4'} border-b border-white/10 mb-0`}>
      <div className="flex flex-col gap-2">
        <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-white/80`}>
          Add a song to this setlist:
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-grow w-full sm:w-auto">
            <SongSelector
              tracks={availableTracks}
              isLoading={isLoadingAllTracks}
              selectedTrack={selectedTrack}
              onTrackSelect={handleTrackSelect}
              isMobile={isMobile}
            />
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
  );
};

export default SetlistAddSongForm;
