
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
    console.log("Processing setlist with available tracks:", 
      setlist?.length, availableTracks?.length);
    
    return setlist.map(song => {
      // If the song already has a proper name that isn't a placeholder, use it
      if (song.name && !song.name.startsWith('Popular Song') && 
          !song.name.startsWith('Track ') && !song.name.startsWith('Song ')) {
        return song;
      }
      
      // Find the matching track in availableTracks if possible
      const matchingTrack = availableTracks?.find(track => track.id === song.id);
      if (matchingTrack?.name) {
        return {
          ...song,
          name: matchingTrack.name,
          albumName: matchingTrack.album?.name,
          albumImageUrl: matchingTrack.album?.images?.[0]?.url
        };
      }
      
      // If we still don't have a good name, provide a better fallback
      return {
        ...song,
        name: song.name || `Track ${song.id.substring(0, 6)}`
      };
    });
  }, [setlist, availableTracks]);
  
  return (
    <div className="flex flex-col">
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
