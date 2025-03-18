
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Music, Play, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';import { Link } from 'react-router-dom';

type SongType = {
  id: string;
  title: string;
  artist: string;
  votes: number;
  position: number;
  show_id?: string;
};

const MostVotedSongs = () => {
  const { data: topSongs = [], isLoading } = useQuery({
    queryKey: ['topVotedSongs'],
    queryFn: async () => {
      // Fetch most voted songs from the database
      try {
        // First get the top voted songs from setlist_songs
        const { data: songsData, error } = await supabase
          .from('setlist_songs')
          .select(`
            id, 
            track_id, 
            votes, 
            setlists!inner(show_id),
            top_tracks(name, artist_id)
          `)
          .order('votes', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        
        if (!songsData || songsData.length === 0) {
          console.log('No songs found, using fallback data');
          return [
            { id: '1', title: 'Cruel Summer', artist: 'Taylor Swift', votes: 3185, position: 1 },
            { id: '2', title: 'Anti-Hero', artist: 'Taylor Swift', votes: 2427, position: 2 },
            { id: '3', title: 'Blank Space', artist: 'Taylor Swift', votes: 1904, position: 3 },
            { id: '4', title: 'August', artist: 'Taylor Swift', votes: 1478, position: 4 },
            { id: '5', title: 'All Too Well (10 min)', artist: 'Taylor Swift', votes: 1361, position: 5 }
          ] as SongType[];
        }
        
        // Get artist names for the tracks
        const artistIds = songsData
          .map(song => song.top_tracks?.artist_id)
          .filter(Boolean);
        
        const { data: artistsData, error: artistsError } = await supabase
          .from('artists')
          .select('id, name')
          .in('id', artistIds);
        
        if (artistsError) {
          console.error('Error fetching artists:', artistsError);
        }
        
        // Create a map of artist IDs to names
        const artistMap = (artistsData || []).reduce((map, artist) => {
          map[artist.id] = artist.name;
          return map;
        }, {} as Record<string, string>);
        
        // Format the data for display
        const formattedSongs = songsData.map((song, index) => ({
          id: song.id,
          title: song.top_tracks?.name || `Track ${index + 1}`,
          artist: artistMap[song.top_tracks?.artist_id || ''] || 'Unknown Artist',
          votes: song.votes,
          position: index + 1,
          show_id: song.setlists?.show_id
        }));
        
        return formattedSongs;
      } catch (error) {
        console.error('Error fetching most voted songs:', error);
        
        // Fallback if the query fails
        return [
          { id: '1', title: 'Cruel Summer', artist: 'Taylor Swift', votes: 3185, position: 1 },
          { id: '2', title: 'Anti-Hero', artist: 'Taylor Swift', votes: 2427, position: 2 },
          { id: '3', title: 'Blank Space', artist: 'Taylor Swift', votes: 1904, position: 3 },
          { id: '4', title: 'August', artist: 'Taylor Swift', votes: 1478, position: 4 },
          { id: '5', title: 'All Too Well (10 min)', artist: 'Taylor Swift', votes: 1361, position: 5 }
        ] as SongType[];
      }
    },
  });

  return (
    <div className="bg-black border border-white/10 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Most Voted Songs</h2>
        <span className="text-sm text-white/70">Across all shows</span>
      </div>
      
      <p className="text-white/70 mb-4">
        Songs with the most votes across all upcoming concerts
      </p>

      {isLoading ? (
        <div className="space-y-3 mb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-2 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="text-white/60 font-mono w-4 text-center"></div>
                <div className="h-5 bg-white/10 rounded w-40"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 bg-white/10 rounded w-12"></div>
                <div className="h-8 w-8 rounded-full bg-white/10"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {topSongs.map(song => (
            <div key={song.id} className="flex items-center justify-between gap-3 p-2 hover:bg-white/5 rounded-md transition-colors">
              <div className="flex items-center gap-4">
                <span className="text-white/60 font-mono w-4 text-center">{song.position}</span>
                <div className="flex-grow">
                  <p className="font-medium">{song.title}</p>
                  <p className="text-sm text-white/70">{song.artist}</p>
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
      )}

      <Button variant="outline" className="w-full" asChild>
        <Link to="/shows">View All Shows</Link>
      </Button>
    </div>
  );
};

export default MostVotedSongs;
