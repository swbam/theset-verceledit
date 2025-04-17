import React, { useState, useCallback } from 'react';
import { Venue } from '@/lib/types';
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
import { Search, Loader2, CloudUpload, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface SearchResultVenue {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  image_url?: string | null;
  url?: string | null;
}

interface SyncStatus {
  venue: boolean;
  shows: boolean;
  artists: boolean;
}

const AdminVenues = () => {
  const [venues, setVenues] = useState<SearchResultVenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingStatus, setSyncingStatus] = useState<Record<string, SyncStatus>>({});

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
    // Initialize sync status
    setSyncingStatus(prev => ({
      ...prev,
      [venueId]: { venue: true, shows: false, artists: false }
    }));

    const toastId = toast.loading(`Starting sync for ${venueName}...`);

    try {
      // 1. Sync Venue
      const venueResult = await supabase.functions.invoke('sync-venue', {
        body: { venueId }
      });

      if (!venueResult.data?.success) {
        throw new Error(venueResult.error?.message || 'Venue sync failed');
      }

      // Update status and toast
      setSyncingStatus(prev => ({
        ...prev,
        [venueId]: { ...prev[venueId], venue: false, shows: true }
      }));
      toast.loading(`Syncing upcoming shows for ${venueName}...`, { id: toastId });

      // 2. Get venue's upcoming shows
      const showResult = await supabase.functions.invoke('sync-show', {
        body: { 
          venueId,
          operation: 'venue_shows'
        }
      });

      if (!showResult.data?.success) {
        throw new Error(showResult.error?.message || 'Shows sync failed');
      }

      // Update status for artist sync
      setSyncingStatus(prev => ({
        ...prev,
        [venueId]: { ...prev[venueId], shows: false, artists: true }
      }));
      toast.loading(`Syncing show artists for ${venueName}...`, { id: toastId });

      // 3. Artists are automatically synced by the show sync
      // Just wait a moment for visual feedback
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear sync status and show success
      setSyncingStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[venueId];
        return newStatus;
      });

      toast.success(`Successfully synced ${venueName} with all shows and artists`, { id: toastId });

    } catch (error) {
      console.error(`Error syncing venue ${venueId}:`, error);
      toast.error(`Sync failed for ${venueName}: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
      
      // Clear error state
      setSyncingStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[venueId];
        return newStatus;
      });
    }
  };

  const getSyncStatusText = (status: SyncStatus) => {
    if (status.venue) return "Syncing venue...";
    if (status.shows) return "Syncing shows...";
    if (status.artists) return "Syncing artists...";
    return "Sync All";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Search & Sync Venues</h2>
        <div className="text-sm text-muted-foreground">
          Syncs venue data, upcoming shows, and performing artists
        </div>
      </div>

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
                  <TableCell><Skeleton className="h-10 w-10 rounded" /></TableCell>
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
                    <Avatar className="h-10 w-10 rounded">
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
                      disabled={!!syncingStatus[venue.id]}
                    >
                      {syncingStatus[venue.id] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {getSyncStatusText(syncingStatus[venue.id])}
                        </>
                      ) : (
                        <>
                          <Calendar className="mr-2 h-4 w-4" />
                          Sync All
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

export default AdminVenues;
