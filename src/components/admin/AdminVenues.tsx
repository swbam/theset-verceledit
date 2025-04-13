import React, { useState, useCallback } from 'react';
import { Venue } from '@/lib/types'; // Assuming Venue type exists
import { toast } from 'sonner';
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
import { Search, Loader2, CloudUpload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Use Avatar for consistency

// Define a type for the search results
interface SearchResultVenue {
  id: string; // Assuming this is the external ID (e.g., Ticketmaster ID)
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  image_url?: string | null;
  url?: string | null;
}

const AdminVenues = () => {
  const [venues, setVenues] = useState<SearchResultVenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingVenueId, setSyncingVenueId] = useState<string | null>(null);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setVenues([]);
      return;
    }

    setLoading(true);
    setVenues([]);
    try {
      const params = new URLSearchParams({ type: 'venue', query: searchQuery });
      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to fetch search results');
      }

      const results: SearchResultVenue[] = data.results || [];
      setVenues(results);
      if (results.length === 0) {
        toast.info('No venues found matching your search.');
      }
    } catch (error) {
      console.error('Error searching venues:', error);
      toast.error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const handleSync = async (venueId: string, venueName: string) => {
    setSyncingVenueId(venueId);
    const toastId = toast.loading(`Syncing venue & shows: ${venueName}...`);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'venue',
          id: venueId, // Use external ID
          operation: 'cascade_sync' // Trigger cascade sync
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Sync request failed');
      }

      toast.success(`Cascade sync task queued for ${venueName}.`, { id: toastId });

    } catch (error) {
      console.error(`Error syncing venue ${venueId}:`, error);
      toast.error(`Failed to queue sync for ${venueName}: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setSyncingVenueId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Search & Sync Venues</h2>

      <form onSubmit={handleSearch} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Ticketmaster for venues..."
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
              <TableHead>Location</TableHead>
              <TableHead>External ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell><Skeleton className="h-10 w-10 rounded" /></TableCell> {/* Square for venue */}
                  <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-9 w-[150px] ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : venues.length === 0 && searchQuery ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No venues found matching "{searchQuery}"
                </TableCell>
              </TableRow>
            ) : venues.length === 0 && !searchQuery ? (
                 <TableRow>
                   <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                     Enter a query to search for venues.
                   </TableCell>
                 </TableRow>
            ) : (
              venues.map((venue) => (
                <TableRow key={venue.id}>
                  <TableCell>
                     {/* Use a generic icon or placeholder if no image */}
                    <Avatar className="h-10 w-10 rounded"> {/* Use rounded square */}
                      <AvatarImage src={venue.image_url || undefined} alt={venue.name} />
                      <AvatarFallback className="rounded">{venue.name?.charAt(0)?.toUpperCase() || 'V'}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{venue.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{venue.id}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(venue.id, venue.name)}
                      disabled={syncingVenueId === venue.id}
                    >
                      {syncingVenueId === venue.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CloudUpload className="mr-2 h-4 w-4" />
                      )}
                      Sync Venue & Shows
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

export default AdminVenues;
