
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Music, Play, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SongType = {
  id: string;
  title: string;
  artist: string;
  votes: number;
  position: number;
};

const MostVotedSongs = () => {
  const { data: topSongs = [] } = useQuery({
    queryKey: ['topVotedSongs'],
    queryFn: async () => {
      // Placeholder data - in a real app, you'd fetch this from your API
      return [
        { id: '1', title: 'Cruel Summer', artist: 'Taylor Swift', votes: 3185, position: 1 },
        { id: '2', title: 'Anti-Hero', artist: 'Taylor Swift', votes: 2427, position: 2 },
        { id: '3', title: 'Blank Space', artist: 'Taylor Swift', votes: 1904, position: 3 },
        { id: '4', title: 'August', artist: 'Taylor Swift', votes: 1478, position: 4 },
        { id: '5', title: 'All Too Well (10 min)', artist: 'Taylor Swift', votes: 1361, position: 5 }
      ] as SongType[];
    },
  });

  return (
    <div className="bg-black border border-white/10 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Most Voted Songs</h2>
        <span className="text-sm text-white/70">The Eras Tour</span>
      </div>
      
      <p className="text-white/70 mb-4">
        Vote for songs you want to hear in "The Eras Tour"
      </p>

      <div className="space-y-3 mb-4">
        {topSongs.map(song => (
          <div key={song.id} className="flex items-center justify-between gap-3 p-2 hover:bg-white/5 rounded-md transition-colors">
            <div className="flex items-center gap-4">
              <span className="text-white/60 font-mono w-4 text-center">{song.position}</span>
              <div className="flex-grow">
                <p className="font-medium">{song.title}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-white/70">{song.votes.toLocaleString()}</span>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full">
        View All Songs
      </Button>
    </div>
  );
};

export default MostVotedSongs;
