"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface Song {
  id: string;
  name: string;
  position: number;
}

interface SetlistEditorProps {
  setlistId: string;
  initialSongs?: Song[];
  artistId: string;
}

export function SetlistEditor({ setlistId, initialSongs = [], artistId }: SetlistEditorProps) {
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [newSongName, setNewSongName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!initialSongs.length) {
      fetchSetlistSongs();
    }
  }, [setlistId]);

  async function fetchSetlistSongs() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/setlists/${setlistId}/songs`);
      if (!res.ok) throw new Error('Failed to fetch setlist songs');
      const data = await res.json();
      setSongs(data.sort((a: Song, b: Song) => a.position - b.position));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load setlist songs',
        variant: 'destructive',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function addSong() {
    if (!newSongName.trim()) return;
    
    try {
      setIsSaving(true);
      const res = await fetch(`/api/setlists/${setlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newSongName,
          position: songs.length
        }),
      });

      if (!res.ok) throw new Error('Failed to add song');
      
      const newSong = await res.json();
      setSongs([...songs, newSong]);
      setNewSongName('');
      
      toast({
        title: 'Success',
        description: 'Song added to setlist',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add song',
        variant: 'destructive',
      });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function removeSong(songId: string) {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/setlists/${setlistId}/songs/${songId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove song');
      
      setSongs(songs.filter(song => song.id !== songId));
      
      toast({
        title: 'Success',
        description: 'Song removed from setlist',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove song',
        variant: 'destructive',
      });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDragEnd(result: any) {
    if (!result.destination) return;
    
    const items = Array.from(songs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update positions
    const updatedSongs = items.map((item, index) => ({
      ...item,
      position: index
    }));
    
    setSongs(updatedSongs);
    
    // Save the new order
    try {
      const res = await fetch(`/api/setlists/${setlistId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: updatedSongs }),
      });

      if (!res.ok) throw new Error('Failed to update song order');
      
      toast({
        title: 'Success',
        description: 'Setlist order updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update song order',
        variant: 'destructive',
      });
      console.error(error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Setlist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add a new song..."
            value={newSongName}
            onChange={(e) => setNewSongName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSong()}
            disabled={isSaving}
          />
          <Button 
            onClick={addSong} 
            disabled={!newSongName.trim() || isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add
          </Button>
        </div>
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="setlist-songs">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {songs.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No songs in this setlist yet. Add some songs above.
                  </p>
                ) : (
                  songs.map((song, index) => (
                    <Draggable key={song.id} draggableId={song.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="flex items-center justify-between p-3 bg-card border rounded-md"
                        >
                          <div className="flex items-center">
                            <span className="text-muted-foreground mr-3">{index + 1}.</span>
                            <span>{song.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSong(song.id)}
                            disabled={isSaving}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>
    </Card>
  );
} 