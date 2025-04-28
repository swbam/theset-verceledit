import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Table,
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow, 
  TableCell
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, CloudUpload, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface SearchResultArtist {
  id: string;
  name: string;
  image_url?: string | null;
  url?: string | null;
  ticketmaster_id?: string;
  exists_in_db?: boolean;
  db_id?: string | null;
}

interface SyncStatus {
  artist: boolean;
  shows: boolean;
  songs: boolean;
}

const AdminArtists = () => {
  const [artists, setArtists] = useState<SearchResultArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingStatus, setSyncingStatus] = useState<Record<string, SyncStatus>>({});

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setArtists([]);
      return;
    }

    setLoading(true);
    setArtists([]);
    try {
      const params = new URLSearchParams({ type: 'artist', query: searchQuery });
      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to fetch search results');
      }

      const results: SearchResultArtist[] = data.results || [];
      setArtists(results);
      if (results.length === 0) {
        toast.info('No artists found matching your search.');
      }
    } catch (error) {
      console.error('Error searching artists:', error);
      toast.error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const handleSync = async (artistId: string, artistName: string) => {
    // Initialize sync status
    setSyncingStatus(prev => ({
      ...prev,
      [artistId]: { artist: true, shows: false, songs: false }
    }));

    const toastId = toast.loading(`Starting sync for ${artistName}...`);

    try {
      // Use the centralized sync API
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'sync',
          entityType: 'artist',
          entityId: artistId,
          options: {
            priority: 'high',
            entityName: artistName
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Sync failed');
      }

      // Update status during sync
      setSyncingStatus(prev => ({
        ...prev,
        [artistId]: { ...prev[artistId], artist: false, shows: true }
      }));
      toast.loading(`Syncing shows for ${artistName}...`, { id: toastId });

      // Wait a moment then update to songs
      setTimeout(() => {
        setSyncingStatus(prev => ({
          ...prev,
          [artistId]: { ...prev[artistId], shows: false, songs: true }
        }));
        toast.loading(`Syncing song catalog for ${artistName}...`, { id: toastId });

        // Wait another moment then complete
        setTimeout(() => {
          // Clear sync status and show success
          setSyncingStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[artistId];
            return newStatus;
          });

          toast.success(`Successfully queued sync for ${artistName}`, { id: toastId });
        }, 1500);
      }, 1500);

    } catch (error) {
      console.error(`Error syncing artist ${artistId}:`, error);
      toast.error(`Sync failed for ${artistName}: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
      
      // Clear error state
      setSyncingStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[artistId];
        return newStatus;
      });
    }
  };

  const getSyncStatusText = (status: SyncStatus) => {
    if (status.artist) return "Syncing artist...";
    if (status.shows) return "Syncing shows...";
    if (status.songs) return "Syncing songs...";
    return "Sync";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Search & Sync Artists</h2>
        <div className="text-sm text-muted-foreground">
          Syncs artist data, shows, and song catalog
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Ticketmaster/Spotify for artists..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading || !searchQuery.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Search
        </Button>
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>External ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-9 w-[80px] ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : artists.length === 0 && searchQuery ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  No artists found matching "{searchQuery}"
                </TableCell>
              </TableRow>
            ) : artists.length === 0 && !searchQuery ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  Enter a query to search for artists.
                </TableCell>
              </TableRow>
            ) : (
              artists.map((artist) => (
                <TableRow key={artist.id}>
                  <TableCell>
                    <Avatar>
                      <AvatarImage src={artist.image_url || undefined} />
                      <AvatarFallback>{artist.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    {artist.name}
                    {artist.exists_in_db && (
                      <Badge variant="outline" className="ml-2 bg-green-50">
                        <Check className="h-3 w-3 mr-1" />
                        In Database
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{artist.id}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(artist.exists_in_db ? artist.db_id! : artist.id, artist.name)}
                      disabled={!!syncingStatus[artist.id]}
                    >
                      {syncingStatus[artist.id] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {getSyncStatusText(syncingStatus[artist.id])}
                        </>
                      ) : (
                        <>
                          <CloudUpload className="mr-2 h-4 w-4" />
                          {artist.exists_in_db ? 'Resync' : 'Sync'}
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminArtists;
