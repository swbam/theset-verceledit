import React, { useState, useEffect } from 'react';
// Import client-side safe functions only
import { searchArtistsWithEvents } from '@/lib/ticketmaster';
// Removed imports for server-side logic (save*, fetchAndStore*)
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Calendar, 
  Music, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  MapPin, 
  Building,
  Download
} from 'lucide-react';

// Define interfaces
// Use the shared Artist type if possible, or define locally if needed
// Assuming ArtistWithEvents is the type returned by searchArtistsWithEvents
interface ArtistSearchResult extends ArtistWithEvents {
  imported?: boolean; // Keep local state flags if needed
  savedShowsCount?: number;
  updated_at?: string; // Likely from DB check, might not be needed here anymore
}
// Use BaseArtist for the payload to the Edge Function
import type { Artist as BaseArtist } from '@/lib/types';
import type { ArtistWithEvents } from '@/lib/api/artist'; // Import the search result type

interface Venue {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  image_url?: string;
  updated_at?: string;
  imported?: boolean;
  savedShowsCount?: number;
}

interface Show {
  id: string;
  name: string;
  date: string;
  ticket_url?: string;
  image_url?: string;
  artist_id: string;
  venue?: Venue;
  venue_id?: string;
  updated_at?: string;
  _embedded?: {
    venues?: Array<{
      id: string;
      name: string;
      city?: { name: string };
      state?: { name: string };
      country?: { name: string };
    }>;
  };
  dates?: {
    start?: {
      dateTime: string;
    };
  };
  images?: Array<{
    url: string;
    ratio?: string;
    width?: number;
  }>;
  url?: string;
}

interface ImportStatus {
  success: boolean;
  message: string;
  details?: string;
}

const AdminArtistImport = () => {
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [artistResults, setArtistResults] = useState<ArtistSearchResult[]>([]); // Use updated type
  const [isSearching, setIsSearching] = useState(false);
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [importStatus, setImportStatus] = useState<Record<string, { type: 'artist' | 'shows' | 'tracks' | 'sync'; message: string; success?: boolean }>>({});
  const [generalStatus, setGeneralStatus] = useState<{ message: string; success: boolean } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // For development mode, always set authenticated to true
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: bypassing auth check for admin functionality');
          setIsAuthenticated(true);
          return;
        }
        
        // For production, check actual auth status
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching session:', error);
        }
        setIsAuthenticated(!!data?.session);

        // Subscribe to auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          setIsAuthenticated(!!session);
        });

        return () => {
          authListener?.subscription?.unsubscribe();
        };
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Fallback to authenticated in development
        if (process.env.NODE_ENV === 'development') {
          setIsAuthenticated(true);
        }
      }
    };

    checkAuth();
  }, []);

  // Function to search for artists using Ticketmaster API
  const handleArtistSearch = async () => {
    if (!artistSearchQuery.trim()) return;

    setIsSearching(true);
    setArtistResults([]);
    setGeneralStatus(null);
    setImportStatus({});

    try {
      // searchArtistsWithEvents should return ArtistWithEvents[]
      const results: ArtistWithEvents[] = await searchArtistsWithEvents(artistSearchQuery);
      console.log('Artist search results:', results);

      // Map results to local state type if needed (e.g., adding 'imported' flag)
      // For now, assume ArtistSearchResult is compatible enough or adjust mapping
      const formattedResults: ArtistSearchResult[] = results.map(result => ({
        ...result, // Spread properties from ArtistWithEvents
        // Add any additional local state flags if necessary
        // imported: false, // Example
      }));
      
      setArtistResults(formattedResults);

      if (formattedResults.length === 0) {
        setGeneralStatus({
          message: `No artists found matching "${artistSearchQuery}"`,
          success: false
        });
      }
    } catch (error: unknown) {
      console.error('Error searching artists:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGeneralStatus({
        message: `Error searching for artists: ${errorMessage}`,
        success: false
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Function to handle key press in search input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleArtistSearch();
    }
  };

  // Function to import an artist and their upcoming shows using the new data flow
  // Refactored to invoke the 'import-artist' Edge Function
  const handleImportArtist = async (artist: ArtistSearchResult) => {
    const artistId = artist.id; // Use TM ID as the key for status/loading
    if (!artistId || !artist.name) {
      console.error("Invalid artist data for import:", artist);
      setImportStatus(prev => ({ ...prev, [artistId]: { type: 'artist', message: 'Invalid artist data provided.', success: false } }));
      return;
    }

    console.log(`[Admin Import] Triggering import for artist: ${artist.name} (ID: ${artistId})`);
    setImporting(prev => ({ ...prev, [artistId]: true }));
    setImportStatus(prev => ({ ...prev, [artistId]: { type: 'sync', message: 'Initiating sync...' } }));

    // No need to prepare a complex payload, sync-artist only needs the ID
    // const artistPayload: Partial<BaseArtist> = { ... };

    try {
      // Invoke the NEW sync-artist Edge Function
      console.log(`Invoking sync-artist for ID: ${artistId}`);
      const { data, error } = await supabase.functions.invoke('sync-artist', {
        // Send only the artistId
        body: { artistId: artistId },
      });

      // Handle errors from invoking the function
      if (error) {
        console.error(`[Admin Sync] Error invoking sync-artist function for ${artist.name} (ID: ${artistId}):`, error);
        // Try to parse Supabase function error details if available
        let detailedError = error.message || 'Function invocation failed';
        if (error.context && typeof error.context === 'object' && 'message' in error.context) {
            detailedError = String(error.context.message);
        } else if (typeof error.details === 'string') {
            detailedError = error.details;
        }
        throw new Error(detailedError);
      }

      // Process the response from the sync-artist Edge Function
      console.log(`[Admin Sync] Sync function response for ${artist.name} (ID: ${artistId}):`, data);
      // sync-artist returns { success: true, data: upsertedData } or { error: ... }
      if (data?.success) {
         // You could potentially use data.data (the upserted artist) here if needed
         setImportStatus(prev => ({ ...prev, [artistId]: { type: 'sync', message: 'Sync successful.', success: true } }));
      } else {
         // Error came from within the function execution (e.g., API fetch failed, DB error)
         throw new Error(data?.error || data?.details || 'Sync function returned failure.');
      }

    } catch (error: unknown) {
      console.error(`[Admin Sync] Error during sync process for ${artist.name} (ID: ${artistId}):`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync';
      setImportStatus(prev => ({ ...prev, [artistId]: { type: 'sync', message: `Sync failed: ${errorMessage}`, success: false } }));
    } finally {
      setImporting(prev => ({ ...prev, [artistId]: false }));
    }
  };

  // --- Render Logic ---
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be logged in to access the admin dashboard.
            {process.env.NODE_ENV === 'development' && " (Dev mode: Auth bypassed, check console for errors if this message persists unexpectedly)"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Artists</CardTitle>
        <CardDescription>Search for artists on Ticketmaster and import them along with their upcoming shows.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Artist Search Section */}
        <div className="space-y-2">
          <label htmlFor="artist-search" className="text-sm font-medium">Search Artist Name</label>
          <div className="flex space-x-2">
            <Input
              id="artist-search"
              type="text"
              placeholder="e.g., Taylor Swift"
              value={artistSearchQuery}
              onChange={(e) => setArtistSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSearching}
            />
            <Button onClick={handleArtistSearch} disabled={isSearching || !artistSearchQuery.trim()}>
              {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </div>
        </div>

        {/* General Status Alert */}
        {generalStatus && (
          <Alert variant={generalStatus.success ? 'default' : 'destructive'}>
            {generalStatus.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{generalStatus.success ? 'Status' : 'Error'}</AlertTitle>
            <AlertDescription>{generalStatus.message}</AlertDescription>
          </Alert>
        )}

        {/* Artist Results Table */}
        {artistResults.length > 0 && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead className="text-center">Upcoming Shows</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artistResults.map((artist: ArtistSearchResult) => ( // Use correct type here
                  <TableRow key={artist.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={artist.image} alt={artist.name} />
                        <AvatarFallback>{artist.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{artist.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{artist.upcomingShows || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                             <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImportArtist(artist)}
                                disabled={importing[artist.id]}
                              >
                                {importing[artist.id] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Import {artist.name} and Shows</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                       {/* Display Import Status */}
                       {importStatus[artist.id] && (
                         <div className="mt-1 text-xs text-muted-foreground flex items-center space-x-1">
                            {importing[artist.id] && !importStatus[artist.id].success && <Loader2 className="h-3 w-3 animate-spin" />}
                            {importStatus[artist.id].success === true && <CheckCircle className="h-3 w-3 text-green-500" />}
                            {importStatus[artist.id].success === false && <AlertCircle className="h-3 w-3 text-red-500" />}
                            <span>{importStatus[artist.id].message}</span>
                         </div>
                       )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {/* End Artist Results Table */}
      </CardContent>
    </Card>
  );
};

export default AdminArtistImport;
