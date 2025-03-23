import React, { useState, useEffect } from 'react';
import { searchArtistsWithEvents } from '@/lib/api/artist';
import { saveArtistToDatabase, saveShowToDatabase } from '@/lib/api/database-utils';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from '@/components/ui/alert';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, RefreshCw, Plus, Calendar, Music, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Artist {
  id: string;
  name: string;
  image?: string;
  upcomingShows?: number;
  imported?: boolean;
  savedShowsCount?: number;
  updated_at?: string;
}

interface Venue {
  id: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
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
}

interface ApiError extends Error {
  message: string;
  code?: string;
  status?: number;
}

const AdminArtistImport = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [importStatus, setImportStatus] = useState<Record<string, ImportStatus>>({});
  const [status, setStatus] = useState<{ message: string; success: boolean } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
      
      // Subscribe to auth changes
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        setIsAuthenticated(!!session);
      });
      
      return () => {
        authListener.subscription.unsubscribe();
      };
    };
    
    checkAuth();
  }, []);

  // Function to search for artists using Ticketmaster API
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    setStatus(null);
    
    try {
      const results = await searchArtistsWithEvents(searchQuery);
      console.log('Search results:', results);
      setSearchResults(results);
      
      if (results.length === 0) {
        setStatus({
          message: `No artists found matching "${searchQuery}"`,
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

  // Function to handle Enter key press in search input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Function to directly insert artist to database (bypassing saveArtistToDatabase)
  const insertArtistDirectly = async (artist: Artist) => {
    try {
      console.log('Directly inserting artist to database:', artist);
      
      const { data, error } = await supabase
        .from('artists')
        .upsert({
          id: artist.id,
          name: artist.name,
          image_url: artist.image,
          upcoming_shows: artist.upcomingShows || 0,
          tm_id: artist.id.startsWith('tm-') ? artist.id.substring(3) : artist.id,
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (error) {
        console.error('Error directly inserting artist:', error);
        throw error;
      }
      
      console.log('Artist directly inserted:', data);
      return data[0];
    } catch (error) {
      console.error('Failed to directly insert artist:', error);
      throw error;
    }
  };

  // Function to directly insert show to database (bypassing saveShowToDatabase)
  const insertShowDirectly = async (show: Show, artistId: string) => {
    try {
      console.log('Directly inserting show to database:', show);
      
      // First insert venue if needed
      let venueId = null;
      if (show.venue) {
        const venue = show.venue;
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .upsert({
            id: venue.id || `venue-${Date.now()}`,
            name: venue.name || 'Unknown Venue',
            city: venue.city,
            state: venue.state,
            country: venue.country,
            updated_at: new Date().toISOString()
          })
          .select();
        
        if (venueError) {
          console.error('Error inserting venue:', venueError);
        } else {
          venueId = venueData[0].id;
          console.log('Venue inserted:', venueData[0]);
        }
      }
      
      // Insert show
      const { data, error } = await supabase
        .from('shows')
        .upsert({
          id: show.id,
          name: show.name,
          date: show.date,
          ticket_url: show.ticket_url,
          image_url: show.image_url,
          artist_id: artistId,
          venue_id: venueId,
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (error) {
        console.error('Error directly inserting show:', error);
        throw error;
      }
      
      console.log('Show directly inserted:', data);
      
      // Create setlist for this show
      const { data: setlistData, error: setlistError } = await supabase
        .from('setlists')
        .insert({
          show_id: show.id,
          artist_id: artistId,
          last_updated: new Date().toISOString()
        })
        .select();
      
      if (setlistError) {
        console.error('Error creating setlist for show:', setlistError);
      } else if (setlistData && setlistData.length > 0) {
        console.log('Setlist created for show:', setlistData);
        
        // We can't directly update with setlist_id if it's not in the type
        // Instead, we'll just log that we need to update it
        console.log(`Need to update show ${show.id} with setlist_id ${setlistData[0].id}`);
        
        // Try a direct SQL query in a separate API call if needed
        // This would require a server-side API endpoint
      }
      
      return data[0];
    } catch (error) {
      console.error('Failed to directly insert show:', error);
      throw error;
    }
  };

  // Function to import an artist and their upcoming shows
  const handleImportArtist = async (artist: Artist) => {
    setImporting(prev => ({ ...prev, [artist.id]: true }));
    setImportStatus(prev => ({ ...prev, [artist.id]: null }));
    
    try {
      console.log(`Importing artist: ${artist.name} (ID: ${artist.id})`);
      
      if (!isAuthenticated) {
        throw new Error('You must be logged in to import artists');
      }
      
      // Step 1: Save the artist to the database
      let savedArtist;
      try {
        // First try using the utility function
        savedArtist = await saveArtistToDatabase({
          id: artist.id,
          name: artist.name,
          image_url: artist.image,
          upcoming_shows: artist.upcomingShows || 0,
          tm_id: artist.id.startsWith('tm-') ? artist.id.substring(3) : artist.id
        });
        
        // If it returns the original artist object, it might have failed silently
        if (savedArtist && savedArtist.id === artist.id && !savedArtist.updated_at) {
          console.log('Artist save may have failed silently, trying direct insert');
          savedArtist = await insertArtistDirectly(artist);
        }
      } catch (artistError) {
        console.error('Error with saveArtistToDatabase, trying direct insert:', artistError);
        savedArtist = await insertArtistDirectly(artist);
      }
      
      if (!savedArtist) {
        throw new Error(`Failed to save artist ${artist.name} to database`);
      }
      
      console.log(`Successfully saved artist: ${artist.name}`, savedArtist);
      
      // Step 2: Fetch upcoming shows for this artist
      const events = await fetchArtistEvents(artist.id);
      console.log(`Found ${events.length} events for ${artist.name}`);
      
      // Step 3: Save each show to the database
      let savedShowsCount = 0;
      
      for (const event of events) {
        try {
          const show: Show = {
            id: event.id,
            name: event.name,
            date: event.dates?.start?.dateTime || new Date().toISOString(),
            ticket_url: event.url,
            image_url: event.images?.[0]?.url,
            artist_id: savedArtist.id,
            venue: {
              id: event._embedded?.venues?.[0]?.id || `venue-${Date.now()}`,
              name: event._embedded?.venues?.[0]?.name || 'Unknown Venue',
              city: event._embedded?.venues?.[0]?.city?.name,
              state: event._embedded?.venues?.[0]?.state?.name,
              country: event._embedded?.venues?.[0]?.country?.name
            },
            _embedded: event._embedded,
            dates: event.dates,
            images: event.images,
            url: event.url
          };
          
          let savedShow;
          try {
            // First try using the utility function
            savedShow = await saveShowToDatabase(show);
            
            // If it returns the original show object, it might have failed silently
            if (savedShow && savedShow.id === show.id && !savedShow.updated_at) {
              console.log('Show save may have failed silently, trying direct insert');
              savedShow = await insertShowDirectly(show, savedArtist.id);
            }
          } catch (showUtilError) {
            console.error('Error with saveShowToDatabase, trying direct insert:', showUtilError);
            savedShow = await insertShowDirectly(show, savedArtist.id);
          }
          
          if (savedShow) {
            savedShowsCount++;
            console.log(`Saved show ${savedShowsCount}: ${show.name}`);
          }
        } catch (showError) {
          console.error(`Error saving show for ${artist.name}:`, showError);
        }
      }
      
      // Update status
      setImportStatus(prev => ({
        ...prev,
        [artist.id]: {
          success: true,
          message: `Successfully imported artist and ${savedShowsCount} shows`
        }
      }));
      
      // Update artist in search results to show it's been imported
      setSearchResults(prev => 
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Import Artists</h2>
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
            You need to be logged in to import artists and shows. Please log in first.
          </AlertDescription>
        </Alert>
      )}
      
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {searchResults.length > 0 && (
        <div className="rounded-md border">
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
              {searchResults.map((artist) => (
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
                      <span>{artist.upcomingShows || 0}</span>
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
      
      {isSearching && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Search for artists using the Ticketmaster API</li>
            <li>Select an artist to import them to your database</li>
            <li>The system will automatically fetch and import all upcoming shows for that artist</li>
            <li>Each show will have a setlist created that users can vote on</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminArtistImport;