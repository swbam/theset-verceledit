"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SetlistSong {
  id: string;
  name: string;
  position: number;
  votes: number;
  spotify_id?: string;
  duration_ms?: number;
  preview_url?: string;
  album_name?: string;
  album_image_url?: string;
}

interface Setlist {
  id: string;
  artist_id: string;
  songs: SetlistSong[];
  show: {
    id: string;
    name: string;
    date: string;
  };
}

interface Props {
  setlist: Setlist;
  showId: string;
}

export function SetlistSongRequests({ setlist, showId }: Props) {
  const router = useRouter();
  const [votedSongs, setVotedSongs] = useState<Record<string, boolean>>({});
  const [songs, setSongs] = useState<SetlistSong[]>(setlist.songs || []);
  const [votingInProgress, setVotingInProgress] = useState<Record<string, boolean>>({});

  // Function to vote for a song
  const voteSong = async (songId: string) => {
    // Prevent double voting or voting while in progress
    if (votedSongs[songId] || votingInProgress[songId]) {
      return;
    }
    
    setVotingInProgress(prev => ({ ...prev, [songId]: true }));
    
    try {
      // Update vote count in the database
      const { error } = await supabase
        .from('setlist_songs')
        .update({ 
          vote_count: songs.find(s => s.id === songId)?.votes + 1 
        })
        .eq('id', songId);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setSongs(currentSongs => 
        currentSongs.map(song => 
          song.id === songId 
            ? { ...song, votes: song.votes + 1 } 
            : song
        ).sort((a, b) => b.votes - a.votes)
      );
      
      // Mark song as voted
      setVotedSongs(prev => ({ ...prev, [songId]: true }));
      
      // Save vote in localStorage to prevent multiple votes
      const storedVotes = JSON.parse(localStorage.getItem(`voted_${showId}`) || '{}');
      localStorage.setItem(`voted_${showId}`, JSON.stringify({
        ...storedVotes,
        [songId]: true
      }));
      
      toast.success("Song request registered!");
    } catch (error) {
      console.error("Error voting for song:", error);
      toast.error("Failed to register song request");
    } finally {
      setVotingInProgress(prev => ({ ...prev, [songId]: false }));
    }
  };
  
  // Check localStorage on initial load to restore voted state
  useEffect(() => {
    try {
      const storedVotes = JSON.parse(localStorage.getItem(`voted_${showId}`) || '{}');
      setVotedSongs(storedVotes);
    } catch (e) {
      console.error("Error loading votes from localStorage:", e);
    }
  }, [showId]);

  return (
    <div className="space-y-4">
      {songs.length === 0 ? (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <p className="text-center text-muted-foreground">
              No songs available for this setlist yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        songs.map((song) => (
          <Card key={song.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center p-4">
                <div className="h-12 w-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                  {song.album_image_url ? (
                    <Image
                      src={song.album_image_url}
                      alt={song.album_name || song.name}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted">
                      🎵
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex-1 overflow-hidden">
                  <h3 className="font-medium truncate">{song.name}</h3>
                  {song.album_name && (
                    <p className="text-sm text-muted-foreground truncate">
                      {song.album_name}
                    </p>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "flex items-center justify-center ml-2",
                    votedSongs[song.id] && "text-red-500"
                  )}
                  disabled={votedSongs[song.id] || votingInProgress[song.id]}
                  onClick={() => voteSong(song.id)}
                >
                  <Heart
                    className={cn(
                      "h-5 w-5",
                      votedSongs[song.id] && "fill-current"
                    )}
                  />
                  <span className="ml-1.5">{song.votes}</span>
                </Button>
              </div>
              
              {song.preview_url && (
                <div className="p-2 bg-muted/10 border-t">
                  <audio
                    src={song.preview_url}
                    controls
                    className="w-full h-10 text-xs"
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
} 