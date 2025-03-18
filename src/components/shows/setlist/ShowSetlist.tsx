import React from 'react';
import VotableSetlistTable from '@/components/setlist/VotableSetlistTable';
import { SetlistAddSongForm } from './index';
import { Song, Track } from '@/hooks/realtime/types';

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
  setlistId: string | null; // Add setlistId to props
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
  anonymousVoteCount = 0,
  setlistId
}: ShowSetlistProps) => {
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
      {/* Display setlist creation status if needed */}
      {!setlistId && !setlist.length && (
        <div className="p-4 text-amber-400 bg-amber-900/30 border border-amber-700 rounded-md mb-4">
          Creating setlist... This may take a moment.
        </div>
      )}
      
      {/* Song selection form at the top */}
      <SetlistAddSongForm
        availableTracks={availableTracks}
        isLoadingAllTracks={isLoadingAllTracks}
        selectedTrack={selectedTrack}
        setSelectedTrack={setSelectedTrack}
        handleAddSong={handleAddSong}
      />
      
      {/* Votable setlist table */}
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
