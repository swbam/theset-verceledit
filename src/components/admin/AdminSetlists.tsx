
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Setlist } from '@/lib/types';
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
import { Search, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

const AdminSetlists = () => {
  // Define extended type for setlists with additional properties
  type SetlistWithMeta = Setlist & {
    songCount?: number;
    last_updated?: string;
    show?: {
      name?: string;
      date?: string;
      artist_id?: {
        name?: string;
      }
    }
  };
  
  const [setlists, setSetlists] = useState<SetlistWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchSetlists = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('setlists')
        .select(`
          *,
          show:show_id (
            name,
            date,
            artist_id (name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Fetch song counts for each setlist
      const setlistsWithSongs = await Promise.all(
        (data || []).map(async (setlist) => {
          const { count, error: songsError } = await supabase
            .from('played_setlist_songs')
            .select('*', { count: 'exact', head: true })
            .eq('setlist_id', setlist.id);
            
          if (songsError) {
            console.error('Error fetching song count:', songsError);
            return { ...setlist, songCount: 0 };
          }
          
          return { ...setlist, songCount: count || 0 };
        })
      );
      
      // Convert null values to undefined to match the Setlist type definition
      const typeSafeSetlists = setlistsWithSongs.map(setlist => ({
        ...setlist,
        created_at: setlist.created_at || undefined,
        updated_at: setlist.updated_at || undefined,
        date: setlist.date || undefined,
        artist_id: setlist.artist_id || undefined,
        show_id: setlist.show_id || undefined,
        tour_name: setlist.tour_name || undefined,
        venue: setlist.venue || undefined,
        venue_city: setlist.venue_city || undefined
      })) as SetlistWithMeta[];
      
      setSetlists(typeSafeSetlists);
    } catch (error) {
      console.error('Error fetching setlists:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSetlists();
  }, []);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSetlists();
    setRefreshing(false);
  };
  
  // Filter setlists based on search query
  const filteredSetlists = searchQuery 
    ? setlists.filter(setlist => 
        setlist.show?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        setlist.show?.artist_id?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : setlists;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Setlists Management</h2>
        <Button 
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by show or artist..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Show</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead>Songs</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[50px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-9 w-[100px] ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredSetlists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  {searchQuery ? 'No setlists found matching your search' : 'No setlists found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredSetlists.map((setlist) => (
                <TableRow key={setlist.id}>
                  <TableCell className="font-medium">
                    {setlist.show?.name || 'Unknown Show'}
                  </TableCell>
                  <TableCell>
                    {setlist.show?.artist_id?.name || 'Unknown Artist'}
                  </TableCell>
                  <TableCell>{setlist.songCount}</TableCell>
                  <TableCell>
                    {setlist.created_at ? new Date(setlist.created_at).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {setlist.last_updated ? new Date(setlist.last_updated).toLocaleDateString() : 
                     setlist.updated_at ? new Date(setlist.updated_at).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/shows/${setlist.show_id}`}>
                        View
                      </Link>
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

export default AdminSetlists;
