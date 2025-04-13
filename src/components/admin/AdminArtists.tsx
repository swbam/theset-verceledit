
import React, { useState, useCallback } from 'react';
import { Artist } from '@/lib/types'; // Keep Artist type if needed
import { toast } from 'sonner'; // For user feedback
import {
  Table,
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Loader2, CloudUpload } from 'lucide-react'; // Add Loader2, CloudUpload
import { Skeleton } from '@/components/ui/skeleton';
// Removed Link from react-router-dom if not used
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Define a type for the search results (might differ from DB Artist type)
interface SearchResultArtist {
  id: string; // Assuming this is the external ID (e.g., Ticketmaster ID)
  name: string;
  image_url?: string | null;
  url?: string | null;
  // Add other relevant fields returned by your search API if needed
}

const AdminArtists = () => {
  const [artists, setArtists] = useState<SearchResultArtist[]>([]);
  const [loading, setLoading] = useState(false); // Not loading initially
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingArtistId, setSyncingArtistId] = useState<string | null>(null);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Prevent form submission if called from form
    if (!searchQuery.trim()) {
      // Optionally clear results or show message if query is empty
      setArtists([]);
      return;
    }

    setLoading(true);
    setArtists([]); // Clear previous results
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
    setSyncingArtistId(artistId);
    const toastId = toast.loading(`Syncing artist: ${artistName}...`);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'artist',
          id: artistId, // Use external ID
          operation: 'create' // 'create' operation handles upsert via sync service
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Sync request failed');
      }

      toast.success(`Sync task queued for ${artistName}.`, { id: toastId });
      // Optionally refresh the view or indicate sync status

    } catch (error) {
      console.error(`Error syncing artist ${artistId}:`, error);
      toast.error(`Failed to queue sync for ${artistName}: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setSyncingArtistId(null);
    }
  };


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Search & Sync Artists</h2>

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
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>External ID</TableHead>
              {/* Remove columns not directly available from search API or less relevant here */}
              {/* <TableHead>Spotify ID</TableHead> */}
              {/* <TableHead>Upcoming Shows</TableHead> */}
              {/* <TableHead>Popularity</TableHead> */}
              {/* <TableHead>Last Updated</TableHead> */}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Show skeleton rows while loading search results
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
            ) : artists.length === 0 && searchQuery ? ( // Show message only if search was performed
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
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={artist.image_url || undefined} alt={artist.name} />
                      <AvatarFallback>{artist.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{artist.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{artist.id}</TableCell>
                  {/* Removed extra cells */}
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(artist.id, artist.name)}
                      disabled={syncingArtistId === artist.id}
                    >
                      {syncingArtistId === artist.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CloudUpload className="mr-2 h-4 w-4" />
                      )}
                      Sync
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
