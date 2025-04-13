import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Define types for the setlist items (adjust based on actual data structure)
interface VotedSong {
  id: string;
  name: string;
  vote_count: number;
}

interface PlayedSong {
  position: number;
  info: string | null;
  is_encore: boolean;
  song: {
    id: string;
    name: string;
  } | null;
}

interface PastShowComparisonProps {
  votedSetlist: VotedSong[];
  playedSetlist: PlayedSong[];
  isLoadingPlayedSetlist: boolean;
}

const SetlistColumn = ({ title, songs, renderSong }: { title: string; songs: any[]; renderSong: (song: any, index: number) => React.ReactNode }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {songs.length > 0 ? (
        songs.map(renderSong)
      ) : (
        <p className="text-sm text-muted-foreground">No songs found.</p>
      )}
    </CardContent>
  </Card>
);

const PastShowComparison: React.FC<PastShowComparisonProps> = ({
  votedSetlist,
  playedSetlist,
  isLoadingPlayedSetlist,
}) => {
  const renderVotedSong = (song: VotedSong, index: number) => (
    <div key={song.id || index} className="flex justify-between items-center text-sm py-1 border-b last:border-b-0">
      <span>{index + 1}. {song.name || 'Unknown Song'}</span>
      <span className="text-muted-foreground">{song.vote_count ?? 0} votes</span>
    </div>
  );

  const renderPlayedSong = (song: PlayedSong, index: number) => (
    <div key={song.song?.id || index} className="flex justify-between items-center text-sm py-1 border-b last:border-b-0">
      <span>{song.position}. {song.song?.name || 'Unknown Song'} {song.is_encore ? '(Encore)' : ''}</span>
      {song.info && <span className="text-xs text-muted-foreground ml-2">({song.info})</span>}
    </div>
  );

  const PlayedSetlistSkeleton = () => (
    <div className="space-y-2">
      {[...Array(10)].map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );

  // Sort voted setlist by vote count descending
  const sortedVotedSetlist = [...votedSetlist].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fan Voted Setlist Column */}
        <SetlistColumn
          title="Fan Voted Setlist"
          songs={sortedVotedSetlist}
          renderSong={renderVotedSong}
        />

        {/* Actual Setlist Played Column */}
        <Card>
          <CardHeader>
            <CardTitle>Actual Setlist Played</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingPlayedSetlist ? (
              <PlayedSetlistSkeleton />
            ) : playedSetlist.length > 0 ? (
              playedSetlist.map(renderPlayedSong)
            ) : (
              <p className="text-sm text-muted-foreground">Actual setlist not available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PastShowComparison;
