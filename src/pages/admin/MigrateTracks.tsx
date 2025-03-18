import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createArtistSongsTable } from '@/lib/db/migrations/create-artist-songs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';

interface MigrationStatus {
  artistsTotal: number;
  artistsProcessed: number;
  songsTotal: number;
  songsProcessed: number;
  errors: string[];
  startTime: Date | null;
  endTime: Date | null;
  isRunning: boolean;
}

const MigrateTracksPage = () => {
  const [status, setStatus] = useState<MigrationStatus>({
    artistsTotal: 0,
    artistsProcessed: 0,
    songsTotal: 0,
    songsProcessed: 0,
    errors: [],
    startTime: null,
    endTime: null,
    isRunning: false
  });

  const createTable = async () => {
    try {
      setStatus(prev => ({ ...prev, isRunning: true, errors: [] }));
      const result = await createArtistSongsTable();
      
      if (result.success) {
        setStatus(prev => ({ 
          ...prev, 
          errors: [],
          isRunning: false,
          endTime: new Date()
        }));
      } else {
        setStatus(prev => ({ 
          ...prev, 
          errors: [...prev.errors, `Failed to create table: ${result.error}`],
          isRunning: false,
          endTime: new Date()
        }));
      }
    } catch (error) {
      setStatus(prev => ({ 
        ...prev, 
        errors: [...prev.errors, `Error: ${error instanceof Error ? error.message : String(error)}`],
        isRunning: false,
        endTime: new Date()
      }));
    }
  };

  const migrateAllArtists = async () => {
    try {
      // Reset status and start timer
      setStatus({
        artistsTotal: 0,
        artistsProcessed: 0,
        songsTotal: 0,
        songsProcessed: 0,
        errors: [],
        startTime: new Date(),
        endTime: null,
        isRunning: true
      });

      // Get all artists that have stored_tracks
      const { data: artists, error: artistsError } = await supabase
        .from('artists')
        .select('id, name, stored_tracks')
        .not('stored_tracks', 'is', null);

      if (artistsError) {
        throw new Error(`Failed to fetch artists: ${artistsError.message}`);
      }

      // Update total artists count
      setStatus(prev => ({ 
        ...prev, 
        artistsTotal: artists.length,
        songsTotal: artists.reduce((total, artist) => {
          const tracks = Array.isArray(artist.stored_tracks) ? artist.stored_tracks : [];
          return total + tracks.length;
        }, 0)
      }));

      // Process each artist
      for (const artist of artists) {
        try {
          if (!artist.stored_tracks || !Array.isArray(artist.stored_tracks)) {
            setStatus(prev => ({ 
              ...prev, 
              artistsProcessed: prev.artistsProcessed + 1,
              errors: [...prev.errors, `Artist ${artist.name} (${artist.id}) has no valid stored_tracks`]
            }));
            continue;
          }

          const tracks = artist.stored_tracks;
          console.log(`Processing ${tracks.length} tracks for artist ${artist.name}`);

          // Determine top tracks by popularity (top 20)
          const sortedTracks = [...tracks]
            .filter(track => track && track.id)
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
          
          const topTrackIds = new Set(sortedTracks.slice(0, 20).map(track => track.id));

          // Process tracks in batches of 100
          const batchSize = 100;
          for (let i = 0; i < tracks.length; i += batchSize) {
            const batch = tracks.slice(i, i + batchSize);
            
            // Map tracks to the artist_songs schema
            const tracksToInsert = batch.map(track => ({
              id: track.id,
              artist_id: artist.id,
              name: track.name || `Unknown Track ${track.id?.substring(0, 6)}`,
              album_id: track.album?.id,
              album_name: track.album?.name,
              album_image_url: track.album?.images?.[0]?.url,
              release_date: track.album?.release_date,
              spotify_url: track.uri,
              preview_url: track.preview_url,
              duration_ms: track.duration_ms,
              popularity: track.popularity || 0,
              explicit: track.explicit || false,
              track_number: track.track_number,
              is_top_track: track.id ? topTrackIds.has(track.id) : false,
              last_updated: new Date().toISOString()
            }));
            
            // Insert into artist_songs table
            const { error: insertError } = await supabase
              .from('artist_songs')
              .upsert(tracksToInsert, { onConflict: 'id,artist_id' });
              
            if (insertError) {
              setStatus(prev => ({ 
                ...prev, 
                errors: [...prev.errors, `Error inserting batch for ${artist.name}: ${insertError.message}`]
              }));
            }
            
            // Update processed count
            setStatus(prev => ({ 
              ...prev, 
              songsProcessed: prev.songsProcessed + batch.length
            }));
          }

          // Mark artist as processed
          setStatus(prev => ({ ...prev, artistsProcessed: prev.artistsProcessed + 1 }));
          
        } catch (artistError) {
          setStatus(prev => ({ 
            ...prev, 
            artistsProcessed: prev.artistsProcessed + 1,
            errors: [...prev.errors, `Error processing artist ${artist.name}: ${artistError instanceof Error ? artistError.message : String(artistError)}`]
          }));
        }
      }

      // Migration complete
      setStatus(prev => ({ 
        ...prev, 
        isRunning: false,
        endTime: new Date()
      }));

    } catch (error) {
      setStatus(prev => ({ 
        ...prev, 
        isRunning: false,
        endTime: new Date(),
        errors: [...prev.errors, `Migration failed: ${error instanceof Error ? error.message : String(error)}`]
      }));
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString();
  };

  const calculateDuration = () => {
    if (!status.startTime) return 'N/A';
    const endTime = status.endTime || new Date();
    const durationMs = endTime.getTime() - status.startTime.getTime();
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <AdminLayout title="Migrate Tracks">
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Track Migration Tool</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Create artist_songs Table</h2>
            <p className="mb-4 text-zinc-400">
              This will create the new artist_songs table and migrate any existing data from top_tracks.
            </p>
            <Button 
              onClick={createTable} 
              disabled={status.isRunning}
              className="w-full"
            >
              {status.isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Table
            </Button>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Migrate All Artist Songs</h2>
            <p className="mb-4 text-zinc-400">
              This will process all artists with stored tracks and migrate them to the artist_songs table.
            </p>
            <Button 
              onClick={migrateAllArtists} 
              disabled={status.isRunning}
              className="w-full"
            >
              {status.isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Migrate All Artists
            </Button>
          </Card>
        </div>
        
        {/* Progress Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Migration Progress</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-900 p-4 rounded-lg">
              <div className="text-sm text-zinc-400">Artists</div>
              <div className="text-xl font-bold">{status.artistsProcessed} / {status.artistsTotal}</div>
            </div>
            
            <div className="bg-zinc-900 p-4 rounded-lg">
              <div className="text-sm text-zinc-400">Songs</div>
              <div className="text-xl font-bold">{status.songsProcessed} / {status.songsTotal}</div>
            </div>
            
            <div className="bg-zinc-900 p-4 rounded-lg">
              <div className="text-sm text-zinc-400">Started</div>
              <div className="text-xl font-bold">{formatTime(status.startTime)}</div>
            </div>
            
            <div className="bg-zinc-900 p-4 rounded-lg">
              <div className="text-sm text-zinc-400">Duration</div>
              <div className="text-xl font-bold">{calculateDuration()}</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          {status.artistsTotal > 0 && (
            <div className="w-full bg-zinc-900 rounded-full h-2.5 mb-6">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${Math.round((status.artistsProcessed / status.artistsTotal) * 100)}%` }}
              ></div>
            </div>
          )}
          
          {/* Errors Section */}
          {status.errors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2 text-red-500">Errors ({status.errors.length})</h3>
              <div className="bg-zinc-900 p-3 rounded-lg max-h-60 overflow-y-auto">
                <ul className="space-y-1">
                  {status.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-400">{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default MigrateTracksPage; 