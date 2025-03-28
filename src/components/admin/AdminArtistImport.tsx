import React, { useState, useEffect } from 'react';
import { searchArtistsWithEvents, fetchArtistEvents } from '@/lib/ticketmaster';
// Make sure this function exists in the ticketmaster.ts file
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from '@/lib/api/database-utils';
import { fetchAndStoreArtistTracks } from '@/lib/api/database';
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
interface Artist {
  id: string;
  name: string;
  image?: string;
  upcoming_shows?: number;
  imported?: boolean;
  savedShowsCount?: number;
  updated_at?: string;
  spotify_id?: string;
}

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
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
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
      const results = await searchArtistsWithEvents(artistSearchQuery);
      console.log('Artist search results:', results);
      
      // Format results to match our Artist interface
      const formattedResults = results.map(result => ({
        id: result.id,
        name: result.name,
        image: result.image,
        upcoming_shows: result.upcomingShows || 0,
        spotify_id: result.spotify_id || undefined
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
  const handleImportArtist = async (artist: Artist) => {
    if (!artist || !artist.id) {
      console.error("Invalid artist data for import:", artist);
      setImportStatus(prev => ({ ...prev, [artist?.id || 'unknown']: { type: 'artist', message: 'Invalid artist data provided.', success: false } }));
      return;
    }
    
    const artistId = artist.id;
    console.log(`Starting import for artist: ${artist.name} (ID: ${artistId})`);

    setImporting(prev => ({ ...prev, [artistId]: true }));
    setImportStatus(prev => ({ ...prev, [artistId]: { type: 'artist', message: 'Saving artist...' } }));

    try {
      // 1. Save Artist (includes fetching tracks if spotify_id is present)
      const artistToSave: any = {
        id: artist.id,
        name: artist.name,
        image: artist.image,
        spotify_id: artist.spotify_id
      };
      const savedArtist = await saveArtistToDatabase(artistToSave);

      if (!savedArtist || !savedArtist.id) {
        throw new Error('Failed to save artist to database.');
      }
      
      const dbArtistId = savedArtist.id;

      setImportStatus(prev => ({ ...prev, [artistId]: { type: 'artist', message: 'Artist saved. Fetching events...', success: true } }));
      console.log(`Artist ${artist.name} saved/updated with DB ID: ${dbArtistId}. Fetching events...`);

      // 2. Fetch Artist Events from Ticketmaster
      const eventsData = await fetchArtistEvents(artistId);
      const events: Show[] = eventsData?.events || [];

      if (events.length === 0) {
        setImportStatus(prev => ({ ...prev, [artistId]: { type: 'shows', message: 'Artist saved. No upcoming events found.', success: true } }));
        console.log(`No upcoming events found for artist ${artist.name}`);
        setImporting(prev => ({ ...prev, [artistId]: false }));
        return;
      }

      setImportStatus(prev => ({ ...prev, [artistId]: { type: 'shows', message: `Found ${events.length} events. Saving shows...` } }));
      console.log(`Found ${events.length} events for ${artist.name}. Saving...`);

      // 3. Save each Show (triggers background sync via saveShowToDatabase)
      let savedShowsCount = 0;
      let firstVenueSyncTriggered = false;
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        setImportStatus(prev => ({
          ...prev,
          [artistId]: { type: 'shows', message: `Saving show ${i + 1}/${events.length}: ${event.name}...` }
        }));

        try {
          const tmVenue = event._embedded?.venues?.[0];
          const venueForShow: Venue | undefined = tmVenue ? {
            id: tmVenue.id,
            name: tmVenue.name,
            city: tmVenue.city?.name,
            state: tmVenue.state?.name,
            country: tmVenue.country?.name
          } : undefined;

          const showData: Show = {
            id: event.id,
            name: event.name,
            date: event.dates?.start?.dateTime,
            ticket_url: event.url,
            image_url: event.images?.[0]?.url,
            artist_id: dbArtistId,
            venue_id: venueForShow?.id,
            artist: savedArtist,
            venue: venueForShow
          };

          const savedShow = await saveShowToDatabase(showData, false);

          if (savedShow) {
            savedShowsCount++;
            if (!firstVenueSyncTriggered && venueForShow?.id) {
              console.log(`Background sync possibly initiated for venue ${venueForShow.name} (${venueForShow.id})`);
              firstVenueSyncTriggered = true;
            }
          } else {
            console.warn(`Failed to save show ${event.name} (ID: ${event.id})`);
          }
        } catch (showError) {
          console.error(`Error saving show ${event.name} (ID: ${event.id}):`, showError);
        }
      }

      // 4. Final Status Update
      let finalMessage = `Import complete for ${artist.name}. Saved ${savedShowsCount}/${events.length} shows.`;
      if (firstVenueSyncTriggered) {
        finalMessage += " Background venue sync(s) initiated.";
      }
      setImportStatus(prev => ({ ...prev, [artistId]: { type: 'sync', message: finalMessage, success: true } }));
      console.log(finalMessage);

    } catch (error: unknown) {
      console.error(`Error importing artist ${artist.name}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during import';
      setImportStatus(prev => ({ ...prev, [artistId]: { type: 'artist', message: `Import failed: ${errorMessage}`, success: false } }));
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
                {artistResults.map((artist) => (
                  <TableRow key={artist.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={artist.image} alt={artist.name} />
                        <AvatarFallback>{artist.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{artist.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{artist.upcoming_shows || 0}</Badge>
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
