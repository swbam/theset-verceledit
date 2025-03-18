import React, { useState } from 'react';
import { batchCreateSetlistsForPopularShows, createSetlistsForSpecificShows, createSetlistsForArtist } from '@/lib/api/db/setlist-batch';
import { supabase } from '@/lib/supabase';import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, AlertCircle, Search, Import, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { searchArtistsWithEvents } from '@/lib/api/artist/search';
import { saveArtistToDatabase } from '@/lib/api/db/artist-utils';
import { fetchArtistEvents } from '@/lib/ticketmaster';
import { getArtistById, getArtistTopTracks } from '@/lib/spotify';
import { syncArtistStatsToDatabase } from '@/lib/api/db/artist-utils';
import { importArtistCatalog } from '@/lib/api/db/artist-utils';

interface BatchResult {
  processed: number;
  created: number;
  errors: string[];
  timestamp: string;
}

interface ArtistResult {
  id: string;
  name: string;
  image?: string;
  upcomingShows: number;
  spotify_id?: string;
}

const ManageSetlistsPage = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [specificShowIds, setSpecificShowIds] = useState('');
  const [artistId, setArtistId] = useState('');
  const [results, setResults] = useState<BatchResult[]>([]);
  const [featuredShows, setFeaturedShows] = useState<any[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  
  // Artist search functionality
  const [artistSearch, setArtistSearch] = useState('');
  const [artistResults, setArtistResults] = useState<ArtistResult[]>([]);
  const [importingArtistId, setImportingArtistId] = useState<string | null>(null);
  const [artistImportStatus, setArtistImportStatus] = useState<Record<string, any>>({});

  // Search artists when the search term changes
  const { isLoading: isSearching, refetch: searchArtists } = useQuery({
    queryKey: ['adminArtistSearch', artistSearch],
    queryFn: async () => {
      if (!artistSearch.trim()) return [];
      const artists = await searchArtistsWithEvents(artistSearch);
      setArtistResults(artists);
      return artists;
    },
    enabled: false, // Don't auto-execute, we'll call refetch on button click
  });

  // Function to handle creating setlists for popular shows
  const handleCreateSetlistsForPopularShows = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const result = await batchCreateSetlistsForPopularShows();
      
      const batchResult: BatchResult = {
        ...result,
        timestamp: new Date().toISOString()
      };
      
      setResults(prev => [batchResult, ...prev]);
      
      toast.success(`Created ${result.created} setlists for popular shows`);
    } catch (error) {
      console.error("Error creating setlists for popular shows:", error);
      toast.error("Failed to create setlists for popular shows");
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to handle creating setlists for specific shows
  const handleCreateSetlistsForSpecificShows = async () => {
    if (isProcessing || !specificShowIds.trim()) return;
    
    const showIds = specificShowIds.split(',').map(id => id.trim()).filter(Boolean);
    
    if (showIds.length === 0) {
      toast.error("Please enter at least one show ID");
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await createSetlistsForSpecificShows(showIds);
      
      const batchResult: BatchResult = {
        ...result,
        timestamp: new Date().toISOString()
      };
      
      setResults(prev => [batchResult, ...prev]);
      
      toast.success(`Created ${result.created} setlists for specific shows`);
    } catch (error) {
      console.error("Error creating setlists for specific shows:", error);
      toast.error("Failed to create setlists for specific shows");
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to handle creating setlists for an artist
  const handleCreateSetlistsForArtist = async () => {
    if (isProcessing || !artistId.trim()) return;
    
    setIsProcessing(true);
    try {
      const result = await createSetlistsForArtist(artistId);
      
      const batchResult: BatchResult = {
        ...result,
        timestamp: new Date().toISOString()
      };
      
      setResults(prev => [batchResult, ...prev]);
      
      toast.success(`Created ${result.created} setlists for artist ${artistId}`);
    } catch (error) {
      console.error(`Error creating setlists for artist ${artistId}:`, error);
      toast.error(`Failed to create setlists for artist ${artistId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to load featured shows from the database
  const loadFeaturedShows = async () => {
    setLoadingFeatured(true);
    try {
      // Assuming you have a "featured" flag in your shows table
      // Or you could use any other criteria to determine featured shows
      const { data, error } = await supabase
        .from('shows')
        .select(`
          id,
          name,
          date,
          artists (name),
          venues (name, city, state)
        `)
        .order('date', { ascending: true })
        .limit(10);
      
      if (error) {
        throw error;
      }
      
      setFeaturedShows(data || []);
    } catch (error) {
      console.error("Error loading featured shows:", error);
      toast.error("Failed to load featured shows");
    } finally {
      setLoadingFeatured(false);
    }
  };

  // Create setlists for all featured shows
  const createSetlistsForFeaturedShows = async () => {
    if (isProcessing || featuredShows.length === 0) return;
    
    const showIds = featuredShows.map(show => show.id);
    
    setIsProcessing(true);
    try {
      const result = await createSetlistsForSpecificShows(showIds);
      
      const batchResult: BatchResult = {
        ...result,
        timestamp: new Date().toISOString()
      };
      
      setResults(prev => [batchResult, ...prev]);
      
      toast.success(`Created ${result.created} setlists for featured shows`);
    } catch (error) {
      console.error("Error creating setlists for featured shows:", error);
      toast.error("Failed to create setlists for featured shows");
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to handle artist search
  const handleArtistSearch = async () => {
    if (!artistSearch.trim()) {
      toast.error("Please enter an artist name to search");
      return;
    }
    
    // Reset results
    setArtistResults([]);
    
    // Search for artists
    try {
      await searchArtists();
    } catch (error) {
      console.error("Artist search error:", error);
      toast.error("Failed to search for artists");
    }
  };

  // Function to import an artist's data
  const importArtist = async (artist: ArtistResult) => {
    setImportingArtistId(artist.id);
    setArtistImportStatus({
      ...artistImportStatus,
      [artist.id]: { 
        status: 'importing',
        steps: {
          saveArtist: 'pending',
          findSpotify: 'pending',
          importShows: 'pending',
          importSongs: 'pending'
        }
      }
    });
    
    try {
      // Step 1: Save artist to database
      updateArtistImportStep(artist.id, 'saveArtist', 'processing');
      await saveArtistToDatabase(artist);
      updateArtistImportStep(artist.id, 'saveArtist', 'complete');
      
      // Step 2: Find Spotify ID if not already present
      updateArtistImportStep(artist.id, 'findSpotify', 'processing');
      let spotifyId = artist.spotify_id;
      
      if (!spotifyId) {
        try {
          // Look up the artist in Spotify
          const spotifyArtist = await getArtistById(artist.name);
          if (spotifyArtist?.id) {
            spotifyId = spotifyArtist.id;
            
            // Update the artist with the Spotify ID
            await supabase
              .from('artists')
              .update({ spotify_id: spotifyId })
              .eq('id', artist.id);
          }
        } catch (error) {
          console.error("Error finding Spotify ID:", error);
          updateArtistImportStep(artist.id, 'findSpotify', 'error');
        }
      }
      
      updateArtistImportStep(artist.id, 'findSpotify', spotifyId ? 'complete' : 'warning');
      
      // Step 3: Import shows from Ticketmaster
      updateArtistImportStep(artist.id, 'importShows', 'processing');
      try {
        const shows = await fetchArtistEvents(artist.id);
        updateArtistImportStep(artist.id, 'importShows', 'complete', { count: shows.length });
      } catch (error) {
        console.error("Error importing shows:", error);
        updateArtistImportStep(artist.id, 'importShows', 'error');
      }
      
      // Step 4: Import songs from Spotify if we have a Spotify ID
      if (spotifyId) {
        updateArtistImportStep(artist.id, 'importSongs', 'processing');
        try {
          await importArtistCatalog(artist.id, spotifyId);
          
          // Also sync stats from Spotify
          await syncArtistStatsToDatabase(artist.id, spotifyId);
          
          updateArtistImportStep(artist.id, 'importSongs', 'complete');
        } catch (error) {
          console.error("Error importing songs:", error);
          updateArtistImportStep(artist.id, 'importSongs', 'error');
        }
      } else {
        updateArtistImportStep(artist.id, 'importSongs', 'warning');
      }
      
      // Step 5: Create setlists for this artist's shows
      try {
        const result = await createSetlistsForArtist(artist.id);
        toast.success(`Created ${result.created} setlists for ${artist.name}`);
      } catch (error) {
        console.error("Error creating setlists:", error);
        toast.error("Failed to create some setlists");
      }
      
      toast.success(`Finished importing ${artist.name}`);
    } catch (error) {
      console.error("Artist import error:", error);
      toast.error(`Error importing ${artist.name}`);
    } finally {
      setImportingArtistId(null);
    }
  };

  // Helper to update individual steps in the import process
  const updateArtistImportStep = (artistId: string, step: string, status: string, data: any = null) => {
    setArtistImportStatus(prev => {
      const artistStatus = prev[artistId] || { status: 'importing', steps: {} };
      return {
        ...prev,
        [artistId]: {
          ...artistStatus,
          steps: {
            ...artistStatus.steps,
            [step]: { status, data }
          }
        }
      };
    });
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Manage Setlists</h1>
      
      {/* Artist Search & Import Section */}
      <div className="mb-12 bg-zinc-900 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Artist Search & Import</h2>
        <p className="text-zinc-400 mb-6">
          Search for artists, view their upcoming shows, and import their data including shows, songs, and statistics.
        </p>
        
        <div className="flex gap-3 mb-6">
          <Input
            placeholder="Enter artist name"
            value={artistSearch}
            onChange={(e) => setArtistSearch(e.target.value)}
            className="flex-grow"
            onKeyDown={(e) => e.key === 'Enter' && handleArtistSearch()}
          />
          <Button 
            onClick={handleArtistSearch}
            disabled={isSearching || !artistSearch.trim()}
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>
        
        {artistResults.length > 0 && (
          <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th className="text-left p-3">Artist</th>
                  <th className="text-center p-3">Upcoming Shows</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {artistResults.map((artist) => (
                  <tr key={artist.id} className="border-t border-zinc-800">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {artist.image ? (
                          <img 
                            src={artist.image} 
                            alt={artist.name} 
                            className="w-10 h-10 object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-zinc-800 rounded-md flex items-center justify-center text-zinc-500">
                            ?
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{artist.name}</p>
                          <p className="text-xs text-zinc-500">ID: {artist.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-amber-500 font-semibold">
                        {artist.upcomingShows} show{artist.upcomingShows !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {artistImportStatus[artist.id] ? (
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            {Object.entries(artistImportStatus[artist.id].steps).map(([step, data]: [string, any]) => {
                              let icon = null;
                              switch (data.status) {
                                case 'complete':
                                  icon = <CheckCircle className="h-3 w-3 text-green-500" />;
                                  break;
                                case 'processing':
                                  icon = <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
                                  break;
                                case 'error':
                                  icon = <AlertCircle className="h-3 w-3 text-red-500" />;
                                  break;
                                case 'warning':
                                  icon = <AlertCircle className="h-3 w-3 text-amber-500" />;
                                  break;
                                default:
                                  icon = <div className="h-3 w-3 rounded-full bg-zinc-600" />;
                              }
                              return (
                                <div key={step} className="flex items-center">
                                  {icon}
                                </div>
                              );
                            })}
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2"
                            onClick={() => importArtist(artist)}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Re-import
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => importArtist(artist)}
                          disabled={importingArtistId === artist.id}
                          size="sm"
                        >
                          {importingArtistId === artist.id ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Import className="mr-1 h-3 w-3" />
                              Import Artist
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Process Popular Shows */}
        <div className="bg-zinc-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Popular Shows</h2>
          <p className="text-zinc-400 mb-6">
            This will find popular shows happening within the next 30 days that don't have setlists yet,
            and create setlists with 5 random songs for each show.
          </p>
          
          <Button 
            onClick={handleCreateSetlistsForPopularShows}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Create Setlists for Popular Shows'
            )}
          </Button>
        </div>
        
        {/* Process Specific Shows */}
        <div className="bg-zinc-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Specific Shows</h2>
          <p className="text-zinc-400 mb-4">
            Enter comma-separated show IDs to create setlists for specific shows.
          </p>
          
          <Textarea
            placeholder="Show IDs (comma-separated)"
            value={specificShowIds}
            onChange={(e) => setSpecificShowIds(e.target.value)}
            className="mb-4"
          />
          
          <Button 
            onClick={handleCreateSetlistsForSpecificShows}
            disabled={isProcessing || !specificShowIds.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Create Setlists for Specific Shows'
            )}
          </Button>
        </div>
        
        {/* Process Artist Shows */}
        <div className="bg-zinc-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Artist Shows</h2>
          <p className="text-zinc-400 mb-4">
            Enter an artist ID to create setlists for all upcoming shows of that artist.
          </p>
          
          <Input
            placeholder="Artist ID"
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            className="mb-4"
          />
          
          <Button 
            onClick={handleCreateSetlistsForArtist}
            disabled={isProcessing || !artistId.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Create Setlists for Artist Shows'
            )}
          </Button>
        </div>
        
        {/* Featured Shows */}
        <div className="bg-zinc-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Featured Shows</h2>
          <p className="text-zinc-400 mb-4">
            Load and create setlists for featured shows on the homepage.
          </p>
          
          <div className="flex gap-4 mb-4">
            <Button 
              onClick={loadFeaturedShows}
              disabled={loadingFeatured}
              variant="outline"
            >
              {loadingFeatured ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load Featured Shows'
              )}
            </Button>
            
            <Button 
              onClick={createSetlistsForFeaturedShows}
              disabled={isProcessing || featuredShows.length === 0}
            >
              Create Setlists
            </Button>
          </div>
          
          {featuredShows.length > 0 && (
            <div className="max-h-60 overflow-y-auto mt-4 bg-zinc-950 rounded p-2">
              <table className="w-full text-sm">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="text-left p-2">Show</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Artist</th>
                  </tr>
                </thead>
                <tbody>
                  {featuredShows.map((show) => (
                    <tr key={show.id} className="border-t border-zinc-800">
                      <td className="p-2">{show.name || 'Unnamed Show'}</td>
                      <td className="p-2">{new Date(show.date).toLocaleDateString()}</td>
                      <td className="p-2">{show.artists?.name || 'Unknown Artist'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Results */}
      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          
          <div className="bg-zinc-900 rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="p-3 text-left">Timestamp</th>
                    <th className="p-3 text-left">Processed</th>
                    <th className="p-3 text-left">Created</th>
                    <th className="p-3 text-left">Errors</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-t border-zinc-800">
                      <td className="p-3">{formatTimestamp(result.timestamp)}</td>
                      <td className="p-3">{result.processed}</td>
                      <td className="p-3">{result.created}</td>
                      <td className="p-3">{result.errors.length}</td>
                      <td className="p-3">
                        {result.errors.length === 0 ? (
                          <span className="flex items-center text-green-500">
                            <CheckCircle className="mr-1 h-4 w-4" /> Success
                          </span>
                        ) : (
                          <span className="flex items-center text-amber-500">
                            <AlertCircle className="mr-1 h-4 w-4" /> With Errors
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Error Details */}
          {results.some(result => result.errors.length > 0) && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Error Details</h3>
              
              {results.filter(result => result.errors.length > 0).map((result, index) => (
                <div key={index} className="mb-4 bg-red-950/30 border border-red-800 rounded-lg p-4">
                  <p className="font-medium mb-2">{formatTimestamp(result.timestamp)}</p>
                  <ul className="list-disc pl-5 text-sm text-red-400">
                    {result.errors.map((error, errorIndex) => (
                      <li key={errorIndex} className="mb-1">{error}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageSetlistsPage; 