import React, { useState, useEffect } from 'react';
import { searchArtistsWithEvents } from '@/lib/ticketmaster';
// Make sure this function exists in the ticketmaster.ts file
import { saveArtistToDatabase, saveShowToDatabase, saveVenueToDatabase } from '@/lib/api/database-utils';
import { fetchArtistEvents } from '@/lib/ticketmaster';
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
  Building 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [activeTab, setActiveTab] = useState('artists');
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [venueSearchQuery, setVenueSearchQuery] = useState('');
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [venueResults, setVenueResults] = useState<Venue[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [importStatus, setImportStatus] = useState<Record<string, ImportStatus>>({});
  const [status, setStatus] = useState<{ message: string; success: boolean } | null>(null);
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
    setStatus(null);

    try {
      const results = await searchArtistsWithEvents(artistSearchQuery);
      console.log('Artist search results:', results);
      
      // Format results to match our Artist interface
      const formattedResults = results.map(result => ({
        id: result.id,
        name: result.name,
        image: result.image,
        upcoming_shows: result.upcomingShows || 0
      }));
      
      setArtistResults(formattedResults);

      if (formattedResults.length === 0) {
        setStatus({
          message: `No artists found matching "${artistSearchQuery}"`,
          success: false
        });
      }
    } catch (error: unknown) {
      console.error('Error searching artists:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus({
        message: `Error searching for artists: ${errorMessage}`,
        success: false
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Function to search for venues using Ticketmaster API
  const handleVenueSearch = async () => {
    if (!venueSearchQuery.trim()) return;

    setIsSearching(true);
    setVenueResults([]);
    setStatus(null);

    try {
      // Call an API to search for venues
      // This is a placeholder - you'll need to implement the actual API call
      const response = await fetch(`/api/venue/search?keyword=${encodeURIComponent(venueSearchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`Venue search failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Venue search results:', data);
      
      setVenueResults(data.venues || []);

      if (data.venues.length === 0) {
        setStatus({
          message: `No venues found matching "${venueSearchQuery}"`,
          success: false
        });
      }
    } catch (error: unknown) {
      console.error('Error searching venues:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus({
        message: `Error searching for venues: ${errorMessage}`,
        success: false
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Function to handle key press in search inputs
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, searchType: 'artist' | 'venue') => {
    if (e.key === 'Enter') {
      if (searchType === 'artist') {
        handleArtistSearch();
      } else {
        handleVenueSearch();
      }
    }
  };

  // Function to import an artist and their upcoming shows using the new data flow
  const handleImportArtist = async (artist: Artist) => {
    setImporting(prev => ({ ...prev, [artist.id]: true }));
    setImportStatus(prev => ({ ...prev, [artist.id]: null }));

    try {
      console.log(`Importing artist: ${artist.name} (ID: ${artist.id})`);

      if (!isAuthenticated) {
        throw new Error('You must be logged in to import artists');
      }

      // Step 1: Save the artist to the database using our utility
      const artistData: Artist = {
        id: artist.id,
        name: artist.name,
        image: artist.image,
        upcoming_shows: artist.upcoming_shows || 0,
        spotify_id: artist.spotify_id
      };

      const savedArtist = await saveArtistToDatabase(artistData);

      if (!savedArtist) {
        throw new Error(`Failed to save artist ${artist.name} to database`);
      }

      console.log(`Successfully saved artist: ${artist.name}`, savedArtist);

      // Step 2: Fetch upcoming shows for this artist
      const events = await fetchArtistEvents(artist.id);
      console.log(`Found ${events.length} events for ${artist.name}`);

      // Step 3: If artist has a Spotify ID, fetch and store their tracks
      if (artist.spotify_id) {
        try {
          console.log(`Fetching tracks for artist ${artist.name} from Spotify`);
          await fetchAndStoreArtistTracks(
            savedArtist.id, 
            artist.spotify_id, 
            artist.name
          );
          console.log(`Successfully stored tracks for artist ${artist.name}`);
        } catch (tracksError) {
          console.error(`Error fetching tracks for artist ${artist.name}:`, tracksError);
          // Continue with show import even if track fetching fails
        }
      }

      // Step 4: Save each show and create setlists
      let savedShowsCount = 0;
      const errors = [];

      for (const event of events) {
        try {
          // Create venue object
          const venue = event._embedded?.venues?.[0];
          let venueData = null;
          
          if (venue) {
            venueData = {
              id: venue.id,
              name: venue.name,
              city: venue.city?.name,
              state: venue.state?.name,
              country: venue.country?.name
            };
            
            // Save venue to database
            const savedVenue = await saveVenueToDatabase(venueData);
            
            if (!savedVenue) {
              console.error(`Failed to save venue for show ${event.name}`);
              continue;
            }
            
            // Create show object
            const showData = {
              id: event.id,
              name: event.name,
              date: event.dates?.start?.dateTime || new Date().toISOString(),
              ticket_url: event.url,
              image_url: event.images?.[0]?.url,
              artist_id: savedArtist.id,
              venue_id: savedVenue.id,
              artist: savedArtist,
              venue: savedVenue
            };

            // Save show to database - this will automatically create a setlist as well
            const savedShow = await saveShowToDatabase(showData);
            
            if (savedShow) {
              savedShowsCount++;
              console.log(`Saved show ${savedShowsCount}: ${showData.name}`);
            } else {
              errors.push(`Failed to save show: ${showData.name}`);
            }
          }
        } catch (showError) {
          console.error(`Error saving show for ${artist.name}:`, showError);
          errors.push(showError instanceof Error ? showError.message : 'Unknown error');
        }
      }

      // Update status
      setImportStatus(prev => ({
        ...prev,
        [artist.id]: {
          success: true,
          message: `Successfully imported artist and ${savedShowsCount} shows`,
          details: errors.length > 0 ? `Errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? ` and ${errors.length - 3} more` : ''}` : undefined
        }
      }));

      // Update artist in search results to show it's been imported
      setArtistResults(prev =>
        prev.map(a =>
          a.id === artist.id
            ? { ...a, imported: true, savedShowsCount }
            : a
        )
      );

    } catch (error: unknown) {
      console.error(`Error importing artist ${artist.name}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import artist';
      setImportStatus(prev => ({
        ...prev,
        [artist.id]: {
          success: false,
          message: `Error: ${errorMessage}`
        }
      }));
    } finally {
      setImporting(prev => ({ ...prev, [artist.id]: false }));
    }
  };

  // Function to import a venue and all its shows
  const handleImportVenue = async (venue: Venue) => {
    setImporting(prev => ({ ...prev, [venue.id]: true }));
    setImportStatus(prev => ({ ...prev, [venue.id]: null }));

    try {
      console.log(`Importing venue: ${venue.name} (ID: ${venue.id})`);

      if (!isAuthenticated) {
        throw new Error('You must be logged in to import venues');
      }

      // Step 1: Save the venue to the database using our utility
      const venueData = {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        state: venue.state,
        country: venue.country,
        image_url: venue.image_url
      };

      const savedVenue = await saveVenueToDatabase(venueData);

      if (!savedVenue) {
        throw new Error(`Failed to save venue ${venue.name} to database`);
      }

      console.log(`Successfully saved venue: ${venue.name}`, savedVenue);

      // Step 2: Call the venue sync API to sync all shows at this venue
      const response = await fetch(`/api/sync/venue?venueId=${venue.id}`);
      
      if (!response.ok) {
        throw new Error(`Venue sync failed: ${response.status}`);
      }
      
      const syncResult = await response.json();
      
      if (!syncResult.success) {
        throw new Error(`Venue sync API error: ${syncResult.message}`);
      }
      
      console.log(`Venue sync complete for ${venue.name}:`, syncResult);

      // Update status
      setImportStatus(prev => ({
        ...prev,
        [venue.id]: {
          success: true,
          message: `Successfully imported venue and ${syncResult.processedShows || 0} shows`,
          details: syncResult.details
        }
      }));

      // Update venue in search results to show it's been imported
      setVenueResults(prev =>
        prev.map(v =>
          v.id === venue.id
            ? { ...v, imported: true, savedShowsCount: syncResult.processedShows || 0 }
            : v
        )
      );

    } catch (error: unknown) {
      console.error(`Error importing venue ${venue.name}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to import venue';
      setImportStatus(prev => ({
        ...prev,
        [venue.id]: {
          success: false,
          message: `Error: ${errorMessage}`
        }
      }));
    } finally {
      setImporting(prev => ({ ...prev, [venue.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Import Data</h2>
      </div>

      {status && (
        <Alert className={status.success ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 mb-6" : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 mb-6"}>
          <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      {!isAuthenticated && (
        <Alert className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 mb-6">
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You need to be logged in to import data. Please log in first.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="artists" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="artists">
            <Music className="mr-2 h-4 w-4" /> 
            Artists
          </TabsTrigger>
          <TabsTrigger value="venues">
            <Building className="mr-2 h-4 w-4" /> 
            Venues
          </TabsTrigger>
        </TabsList>

        {/* Artist Import Tab */}
        <TabsContent value="artists">
          <Card>
            <CardHeader>
              <CardTitle>Search for Artists</CardTitle>
              <CardDescription>
                Search for artists using Ticketmaster API and import them with their upcoming shows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for artists..."
                    className="pl-8"
                    value={artistSearchQuery}
                    onChange={(e) => setArtistSearchQuery(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, 'artist')}
                  />
                </div>
                <Button
                  onClick={handleArtistSearch}
                  disabled={isSearching || !artistSearchQuery.trim()}
                >
                  {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {artistResults.length > 0 && (
            <div className="rounded-md border mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Upcoming Shows</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artistResults.map((artist) => (
                    <TableRow key={artist.id}>
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={artist.image || ''} alt={artist.name} />
                          <AvatarFallback>
                            <Music className="h-5 w-5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{artist.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{artist.upcoming_shows || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {artist.id}
                      </TableCell>
                      <TableCell>
                        {importStatus[artist.id] ? (
                          <Badge
                            variant={importStatus[artist.id].success ? "default" : "destructive"}
                            className="flex items-center gap-1"
                          >
                            {importStatus[artist.id].success ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            {importStatus[artist.id].success ? 'Imported' : 'Failed'}
                          </Badge>
                        ) : artist.imported ? (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Imported
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImportArtist(artist)}
                                disabled={importing[artist.id] || artist.imported || !isAuthenticated}
                              >
                                {importing[artist.id] ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Plus className="mr-2 h-4 w-4" />
                                )}
                                {artist.imported ? 'Imported' : 'Import Artist & Shows'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {!isAuthenticated ? (
                                'You must be logged in to import artists'
                              ) : artist.imported ? (
                                `Already imported with ${artist.savedShowsCount} shows`
                              ) : (
                                `Import ${artist.name} and all upcoming shows to the database`
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {isSearching && activeTab === 'artists' && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {importStatus && Object.keys(importStatus).length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(importStatus).map(([id, status]) => (
                    <Alert 
                      key={id}
                      className={status.success ? 
                        "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300" : 
                        "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                      }
                    >
                      <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
                      <AlertDescription>
                        <div>{status.message}</div>
                        {status.details && <div className="text-xs mt-1">{status.details}</div>}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Venue Import Tab */}
        <TabsContent value="venues">
          <Card>
            <CardHeader>
              <CardTitle>Search for Venues</CardTitle>
              <CardDescription>
                Search for venues using Ticketmaster API and import them with all their upcoming shows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for venues..."
                    className="pl-8"
                    value={venueSearchQuery}
                    onChange={(e) => setVenueSearchQuery(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, 'venue')}
                  />
                </div>
                <Button
                  onClick={handleVenueSearch}
                  disabled={isSearching || !venueSearchQuery.trim()}
                >
                  {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {venueResults.length > 0 && (
            <div className="rounded-md border mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venueResults.map((venue) => (
                    <TableRow key={venue.id}>
                      <TableCell className="font-medium">{venue.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>
                            {[
                              venue.city,
                              venue.state,
                              venue.country
                            ].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {venue.id}
                      </TableCell>
                      <TableCell>
                        {importStatus[venue.id] ? (
                          <Badge
                            variant={importStatus[venue.id].success ? "default" : "destructive"}
                            className="flex items-center gap-1"
                          >
                            {importStatus[venue.id].success ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            {importStatus[venue.id].success ? 'Imported' : 'Failed'}
                          </Badge>
                        ) : venue.imported ? (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Imported
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImportVenue(venue)}
                                disabled={importing[venue.id] || venue.imported || !isAuthenticated}
                              >
                                {importing[venue.id] ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Plus className="mr-2 h-4 w-4" />
                                )}
                                {venue.imported ? 'Imported' : 'Import Venue & Shows'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {!isAuthenticated ? (
                                'You must be logged in to import venues'
                              ) : venue.imported ? (
                                `Already imported with ${venue.savedShowsCount} shows`
                              ) : (
                                `Import ${venue.name} and all upcoming shows to the database`
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {isSearching && activeTab === 'venues' && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Search for artists or venues using the Ticketmaster API</li>
            <li>Select an artist or venue to import them to your database</li>
            <li>The system will automatically fetch and import all upcoming shows</li>
            <li>
              Each show will have a setlist created with 5 random songs from the artist's catalog
              that users can vote on
            </li>
            <li>
              For venues, the system will sync all upcoming shows, automatically creating all artists
              and setlists as needed
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminArtistImport;
