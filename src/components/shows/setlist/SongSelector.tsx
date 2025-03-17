
import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
} from '@/components/ui/select';
import { Track } from '@/hooks/realtime/types';

interface SongSelectorProps {
  tracks: Track[];
  isLoading: boolean;
  selectedTrack: string;
  onTrackSelect: (value: string) => void;
  isMobile?: boolean;
}

const SongSelector = ({
  tracks,
  isLoading,
  selectedTrack,
  onTrackSelect,
  isMobile = false
}: SongSelectorProps) => {
  // Truncate long song names
  const truncateSongName = (name: string, maxLength = 50) => {
    return name && name.length > maxLength ? `${name.substring(0, maxLength)}...` : (name || 'Unknown Track');
  };
  
  // Sort tracks alphabetically by name and filter duplicates
  const sortedTracks = React.useMemo(() => {
    console.log("Sorting available tracks:", tracks?.length);
    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      // Return some mock tracks if no tracks are available
      return Array.from({ length: 10 }, (_, i) => ({
        id: `mock-select-${i}`,
        name: `Song Option ${i + 1}`
      }));
    }
    
    // Filter out duplicates by name (case-insensitive) and invalid tracks
    const uniqueNames = new Set();
    const uniqueTracks = tracks.filter(track => {
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
  }, [tracks]);

  return (
    <Select
      value={selectedTrack}
      onValueChange={onTrackSelect}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full bg-black border-white/10 text-white">
        <SelectValue placeholder="Select a song" />
      </SelectTrigger>
      <SelectContent className="bg-[#0A0A16] border-white/10 text-white z-50 max-h-80 min-w-[200px]">
        {isLoading ? (
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
  );
};

export default SongSelector;
