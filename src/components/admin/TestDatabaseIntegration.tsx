import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, X, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const TestDatabaseIntegration = () => {
  const [status, setStatus] = useState<{ message: string; success: boolean; } | null>(null);
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState<Record<string, any[]>>({
    artists: [],
    shows: [],
    setlists: [],
    setlist_songs: []
  });
  const [newArtist, setNewArtist] = useState({ name: '', image_url: '' });
  const [newShow, setNewShow] = useState({ name: '', artist_id: '', date: '' });
  const [selectedTable, setSelectedTable] = useState('artists');
  const [tableStatuses, setTableStatuses] = useState<Record<string, 'success' | 'error' | 'loading' | null>>({});
  const [dbConfig, setDbConfig] = useState<{url: string, key: string}>({
    url: '***********',
    key: '***********'
  });
  const [showSecrets, setShowSecrets] = useState(false);
  const [rlsPolicies, setRlsPolicies] = useState<any[]>([]);

  // Fetch data for all tables when the component mounts or selectedTable changes
  useEffect(() => {
    fetchTableData();
  }, [selectedTable]);

  // Test database connection
  const testConnection = async () => {
    setLoading(true);
    setStatus(null);
    setTableStatuses({});
    
    try {
      // Test basic connectivity
      const { data, error } = await supabase.from('artists').select('count()', { count: 'exact', head: true });
      
      if (error) {
        throw error;
      }
      
      setStatus({
        message: "Connection to Supabase successful!",
        success: true
      });
      
      // Now test each table
      await testTable('artists');
      await testTable('shows');
      await testTable('setlists');
      await testTable('setlist_songs');
      await testTable('top_tracks');
      
    } catch (error: any) {
      console.error("Database connection test failed:", error);
      setStatus({
        message: `Connection failed: ${error.message || 'Unknown error'}`,
        success: false
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Test access to a specific table
  const testTable = async (tableName: string) => {
    setTableStatuses(prev => ({ ...prev, [tableName]: 'loading' }));
    
    try {
      const { error } = await supabase.from(tableName).select('count()', { count: 'exact', head: true });
      
      if (error) {
        console.error(`Access to ${tableName} failed:`, error);
        setTableStatuses(prev => ({ ...prev, [tableName]: 'error' }));
      } else {
        setTableStatuses(prev => ({ ...prev, [tableName]: 'success' }));
      }
    } catch (error) {
      console.error(`Access to ${tableName} failed:`, error);
      setTableStatuses(prev => ({ ...prev, [tableName]: 'error' }));
    }
  };

  // Fetch data for all tables or a specific table
  const fetchTableData = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from(selectedTable)
        .select('*')
        .limit(10);
      
      if (error) throw error;
      
      setTestData(prev => ({
        ...prev,
        [selectedTable]: data || []
      }));
      
    } catch (error: any) {
      console.error(`Error fetching ${selectedTable} data:`, error);
      setStatus({
        message: `Error fetching data: ${error.message}`,
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a test artist
  const createTestArtist = async () => {
    if (!newArtist.name) {
      setStatus({
        message: "Artist name is required",
        success: false
      });
      return;
    }
    
    setLoading(true);
    setStatus(null);
    
    try {
      const artistId = uuidv4();
      const { error } = await supabase.from('artists').insert({
        id: artistId,
        name: newArtist.name,
        image_url: newArtist.image_url || 'https://placehold.co/400x400?text=Artist',
        created_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      setStatus({
        message: `Artist "${newArtist.name}" created successfully!`,
        success: true
      });
      
      // Clear form and refresh data
      setNewArtist({ name: '', image_url: '' });
      fetchTableData();
      
    } catch (error: any) {
      console.error("Error creating test artist:", error);
      setStatus({
        message: `Error creating artist: ${error.message}`,
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a test show
  const createTestShow = async () => {
    if (!newShow.name || !newShow.artist_id) {
      setStatus({
        message: "Show name and artist_id are required",
        success: false
      });
      return;
    }
    
    setLoading(true);
    setStatus(null);
    
    try {
      const showId = uuidv4();
      const { error } = await supabase.from('shows').insert({
        id: showId,
        name: newShow.name,
        artist_id: newShow.artist_id,
        date: newShow.date || new Date().toISOString(),
        created_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      setStatus({
        message: `Show "${newShow.name}" created successfully!`,
        success: true
      });
      
      // Create a setlist for this show
      try {
        const setlistId = uuidv4();
        const { error: setlistError } = await supabase.from('setlists').insert({
          id: setlistId,
          show_id: showId,
          last_updated: new Date().toISOString()
        });
        
        if (setlistError) {
          console.error("Error creating setlist:", setlistError);
        } else {
          setStatus({
            message: `Show and setlist created successfully!`,
            success: true
          });
        }
      } catch (setlistError) {
        console.error("Error creating setlist:", setlistError);
      }
      
      // Clear form and refresh data
      setNewShow({ name: '', artist_id: '', date: '' });
      fetchTableData();
      
    } catch (error: any) {
      console.error("Error creating test show:", error);
      setStatus({
        message: `Error creating show: ${error.message}`,
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch RLS policies information
  const fetchRLSPolicies = async () => {
    setLoading(true);
    try {
      // Get database info
      const { data: configData, error: configError } = await supabase.rpc('get_db_config');
      
      if (!configError && configData) {
        setDbConfig({
          url: configData.supabase_url || 'Not available',
          key: configData.anon_key || 'Not available'
        });
      }
      
      // Try to fetch RLS policies - this may fail if the function doesn't exist
      // or if the user doesn't have permission to execute it
      const { data: policiesData, error: policiesError } = await supabase.rpc('get_rls_policies');
      
      if (!policiesError && policiesData) {
        setRlsPolicies(policiesData);
      } else {
        console.log('Could not fetch RLS policies:', policiesError);
        
        // Fallback method - try to query each table and determine permissions empirically
        const tables = ['artists', 'shows', 'setlists', 'setlist_songs', 'top_tracks'];
        const policies: any[] = [];
        
        for (const table of tables) {
          // Test read permission
          const { error: readError } = await supabase
            .from(table)
            .select('count(*)', { count: 'exact', head: true });
          
          // Test write permission (with a fake UUID that won't exist)
          const testId = '00000000-0000-0000-0000-000000000000';
          const { error: writeError } = await supabase
            .from(table)
            .upsert({ id: testId })
            .select();
          
          policies.push({
            table,
            can_read: !readError,
            can_write: !writeError,
            read_error: readError?.message || null,
            write_error: writeError?.message || null
          });
        }
        
        setRlsPolicies(policies);
      }
    } catch (error) {
      console.error('Error fetching database configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Test Database Integration</CardTitle>
        <CardDescription>
          Verify the connection to Supabase and test creating records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Test */}
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={testConnection} 
              disabled={loading}
              variant="outline"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test Database Connection
            </Button>
            
            <Button
              onClick={fetchTableData}
              disabled={loading}
              variant="outline"
            >
              Refresh Data
            </Button>
          </div>
          
          {status && (
            <Alert variant={status.success ? "default" : "destructive"}>
              <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}
          
          {/* Table Status Indicators */}
          {Object.keys(tableStatuses).length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {Object.entries(tableStatuses).map(([table, status]) => (
                <div key={table} className="flex items-center space-x-2 p-2 border rounded">
                  {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {status === 'success' && <Check className="h-4 w-4 text-green-500" />}
                  {status === 'error' && <X className="h-4 w-4 text-red-500" />}
                  <span className="text-sm">{table}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Database Configuration Debug Section */}
        <div className="mt-8 border rounded-lg p-4 bg-secondary/10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Database Debug Information</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRLSPolicies}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Fetch DB Info
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Connection Details</h4>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? 'Hide' : 'Show'} Values
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 border rounded bg-background">
                  <span className="font-mono">Supabase URL:</span>
                  <span className="font-mono">{showSecrets ? dbConfig.url : '••••••••••••••••••••••'}</span>
                </div>
                <div className="flex justify-between p-2 border rounded bg-background">
                  <span className="font-mono">Anon Key:</span>
                  <span className="font-mono">{showSecrets ? dbConfig.key : '••••••••••••••••••••••'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Permissions (empirical test results)</h4>
              {rlsPolicies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Read</TableHead>
                      <TableHead>Write</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rlsPolicies.map((policy, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{policy.table}</TableCell>
                        <TableCell>
                          {policy.can_read ? 
                            <Check className="h-4 w-4 text-green-500" /> : 
                            <X className="h-4 w-4 text-red-500" />
                          }
                        </TableCell>
                        <TableCell>
                          {policy.can_write ? 
                            <Check className="h-4 w-4 text-green-500" /> : 
                            <X className="h-4 w-4 text-red-500" />
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Click "Fetch DB Info" to check permissions
                </div>
              )}
            </div>
            
            <Alert variant="default" className="bg-muted/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>RLS Policy Information</AlertTitle>
              <AlertDescription className="text-sm">
                If you're experiencing permission issues, check your Supabase Row Level Security (RLS) policies.
                All tables should have RLS enabled with policies that allow the operations you need.
              </AlertDescription>
            </Alert>
          </div>
        </div>
        
        <Tabs value={selectedTable} onValueChange={setSelectedTable}>
          <TabsList className="mb-4">
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="shows">Shows</TabsTrigger>
            <TabsTrigger value="setlists">Setlists</TabsTrigger>
            <TabsTrigger value="setlist_songs">Setlist Songs</TabsTrigger>
          </TabsList>
          
          {/* Artists Tab */}
          <TabsContent value="artists">
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="artistName">Artist Name</Label>
                    <Input 
                      id="artistName" 
                      value={newArtist.name}
                      onChange={(e) => setNewArtist({...newArtist, name: e.target.value})}
                      placeholder="Artist Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="artistImage">Image URL (optional)</Label>
                    <Input 
                      id="artistImage" 
                      value={newArtist.image_url}
                      onChange={(e) => setNewArtist({...newArtist, image_url: e.target.value})}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
                <Button 
                  onClick={createTestArtist} 
                  disabled={loading || !newArtist.name} 
                  className="mt-2"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Test Artist
                </Button>
              </div>
              
              {/* Artists Table */}
              <div className="border rounded overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testData.artists.length > 0 ? testData.artists.map((artist) => (
                      <TableRow key={artist.id}>
                        <TableCell className="font-mono text-xs truncate max-w-[100px]">{artist.id}</TableCell>
                        <TableCell>{artist.name}</TableCell>
                        <TableCell className="truncate max-w-[150px]">{artist.image_url}</TableCell>
                        <TableCell>{new Date(artist.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          No artists found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
          
          {/* Shows Tab */}
          <TabsContent value="shows">
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="showName">Show Name</Label>
                    <Input 
                      id="showName" 
                      value={newShow.name}
                      onChange={(e) => setNewShow({...newShow, name: e.target.value})}
                      placeholder="Show Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="artistId">Artist ID</Label>
                    <Input 
                      id="artistId" 
                      value={newShow.artist_id}
                      onChange={(e) => setNewShow({...newShow, artist_id: e.target.value})}
                      placeholder="Artist ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="showDate">Date (optional)</Label>
                    <Input 
                      id="showDate" 
                      type="datetime-local"
                      value={newShow.date}
                      onChange={(e) => setNewShow({...newShow, date: e.target.value})}
                    />
                  </div>
                </div>
                <Button 
                  onClick={createTestShow} 
                  disabled={loading || !newShow.name || !newShow.artist_id} 
                  className="mt-2"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Test Show with Setlist
                </Button>
              </div>
              
              {/* Shows Table */}
              <div className="border rounded overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Artist ID</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testData.shows.length > 0 ? testData.shows.map((show) => (
                      <TableRow key={show.id}>
                        <TableCell className="font-mono text-xs truncate max-w-[100px]">{show.id}</TableCell>
                        <TableCell>{show.name}</TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[100px]">{show.artist_id}</TableCell>
                        <TableCell>{show.date ? new Date(show.date).toLocaleString() : 'N/A'}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          No shows found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
          
          {/* Other Tabs Content */}
          <TabsContent value="setlists">
            <div className="border rounded overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Show ID</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testData.setlists.length > 0 ? testData.setlists.map((setlist) => (
                    <TableRow key={setlist.id}>
                      <TableCell className="font-mono text-xs truncate max-w-[100px]">{setlist.id}</TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[100px]">{setlist.show_id}</TableCell>
                      <TableCell>{setlist.last_updated ? new Date(setlist.last_updated).toLocaleString() : 'N/A'}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                        No setlists found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="setlist_songs">
            <div className="border rounded overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Setlist ID</TableHead>
                    <TableHead>Track ID</TableHead>
                    <TableHead>Votes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testData.setlist_songs.length > 0 ? testData.setlist_songs.map((song) => (
                    <TableRow key={song.id}>
                      <TableCell className="font-mono text-xs truncate max-w-[100px]">{song.id}</TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[100px]">{song.setlist_id}</TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[100px]">{song.track_id}</TableCell>
                      <TableCell>{song.votes}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No setlist songs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 mr-2" />
          This component is only for testing purposes. It creates real data in your Supabase database.
        </div>
      </CardFooter>
    </Card>
  );
};

export default TestDatabaseIntegration; 