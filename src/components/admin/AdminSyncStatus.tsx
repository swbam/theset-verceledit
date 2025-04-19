import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, AlertTriangle, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';

interface SyncStats {
  entity_type: string;
  total: number;
  pending: number;
  completed: number;
  failed: number;
  last_sync: string | null;
}

interface SyncTask {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  error?: string | null;
  entity_name?: string | null;
  completed_at?: string | null;
  dependencies?: string[] | null;
  priority?: number | null;
  result?: any;
}

const AdminSyncStatus = () => {
  const [stats, setStats] = useState<SyncStats[]>([]);
  const [recentTasks, setRecentTasks] = useState<SyncTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_tasks')
        .select('entity_type, status')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process data to get stats
      const statsMap = new Map<string, SyncStats>();
      
      // Initialize with default entity types
      ['artist', 'show', 'venue', 'song', 'setlist'].forEach(type => {
        statsMap.set(type, {
          entity_type: type,
          total: 0,
          pending: 0,
          completed: 0,
          failed: 0,
          last_sync: null
        });
      });
      
      // Count tasks by type and status
      data?.forEach(task => {
        const type = task.entity_type;
        const status = task.status;
        
        if (!statsMap.has(type)) {
          statsMap.set(type, {
            entity_type: type,
            total: 0,
            pending: 0,
            completed: 0,
            failed: 0,
            last_sync: null
          });
        }
        
        const stat = statsMap.get(type)!;
        stat.total++;
        
        if (status === 'pending' || status === 'processing') stat.pending++;
        if (status === 'completed') stat.completed++;
        if (status === 'failed') stat.failed++;
      });
      
      // Convert map to array
      setStats(Array.from(statsMap.values()));
      
      // Fetch recent tasks with their last sync time
      const { data: lastSyncData, error: lastSyncError } = await supabase
        .from('sync_tasks')
        .select('entity_type, updated_at, status')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });
        
      if (!lastSyncError && lastSyncData) {
        // Update last sync time for each entity type
        const lastSyncMap = new Map<string, string>();
        lastSyncData.forEach(task => {
          if (task.updated_at && !lastSyncMap.has(task.entity_type)) {
            lastSyncMap.set(task.entity_type, task.updated_at);
          }
        });
        
        setStats(prevStats => 
          prevStats.map(stat => ({
            ...stat,
            last_sync: lastSyncMap.get(stat.entity_type) || stat.last_sync
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching sync stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentTasks = async () => {
    setTasksLoading(true);
    try {
      const { data, error } = await supabase
        .from('sync_tasks')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setRecentTasks(data || []);
    } catch (error) {
      console.error('Error fetching recent tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecentTasks();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentTasks();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchRecentTasks()]);
    setRefreshing(false);
  };

  const runTest = async (testType: string) => {
    setTesting(prev => ({ ...prev, [testType]: true }));
    const toastId = toast.loading(`Running ${testType} test...`);

    try {
      let response;
      
      switch(testType) {
        case 'artist':
          console.log('[AdminSyncStatus] Invoking sync-artist with artistId:', '1f9e8a14-7bca-4f1e-b2d3-431fe1e31595');
          response = await supabase.functions.invoke('sync-artist', {
            body: { artistId: '1f9e8a14-7bca-4f1e-b2d3-431fe1e31595' }
          });
          if (response.error) {
            throw new Error(response.error.message);
          }
          break;
          
        case 'show':
          console.log('[AdminSyncStatus] Invoking sync-show with showId:', 'vvG1iZ9aVt5jDk');
          response = await supabase.functions.invoke('sync-show', {
            body: { showId: 'vvG1iZ9aVt5jDk' }
          });
          if (response.error) {
            throw new Error(response.error.message);
          }
          break;
          
        case 'process':
          // Process pending tasks
            console.log('[AdminSyncStatus] Process test payload:', { operation: 'process', limit: 5 });
          response = await fetch('/api/background-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'process',
              limit: 5
            })
          });
          break;
          
        case 'spotify':
          // Test Spotify sync
          response = await fetch('/api/spotify-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'sync_top_artists'
            })
          });
          break;
          
        default:
          throw new Error(`Unknown test type: ${testType}`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Test failed with status ${response.status}`);
      }

      const result = await response.json();
      toast.success(`${testType} test completed successfully`, { id: toastId });
      
      // Refresh data after test
      await handleRefresh();
    } catch (error) {
      console.error(`Error running ${testType} test:`, error);
      toast.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setTesting(prev => ({ ...prev, [testType]: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="h-3 w-3 mr-1 text-yellow-500" /> Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50"><Loader2 className="h-3 w-3 mr-1 text-blue-500 animate-spin" /> Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="h-3 w-3 mr-1 text-green-500" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="h-3 w-3 mr-1 text-red-500" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return (
      <span title={format(date, 'PPpp')}>
        {formatDistanceToNow(date, { addSuffix: true })}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sync Status</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <Loader2 className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="h-[180px] animate-pulse bg-muted/10" />
          ))
        ) : (
          stats.map((stat) => (
            <Card key={stat.entity_type}>
              <CardHeader className="pb-2">
                <CardTitle className="capitalize">{stat.entity_type}s</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total</div>
                    <div className="text-xl font-bold">{stat.total}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Pending</div>
                    <div className="text-xl font-bold">{stat.pending}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Completed</div>
                    <div className="text-xl font-bold">{stat.completed}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Failed</div>
                    <div className="text-xl font-bold">{stat.failed}</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground pt-0">
                Last synced: {formatDate(stat.last_sync)}
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Test Sync Operations</h3>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => runTest('artist')}
            disabled={testing['artist']}
          >
            {testing['artist'] ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Test Artist Sync
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => runTest('show')}
            disabled={testing['show']}
          >
            {testing['show'] ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Test Show Sync
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => runTest('process')}
            disabled={testing['process']}
          >
            {testing['process'] ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Process Pending Tasks
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => runTest('spotify')}
            disabled={testing['spotify']}
          >
            {testing['spotify'] ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Sync Spotify Top Artists
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Recent Sync Tasks</h3>
        <div className="rounded-md border">
          {tasksLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading recent tasks...
            </div>
          ) : recentTasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No sync tasks found
            </div>
          ) : (
            <div className="divide-y">
              {recentTasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-muted/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="font-medium capitalize mr-2">
                        {task.entity_name || `${task.entity_type} ${task.entity_id.substring(0, 8)}...`}
                      </span>
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(task.updated_at)}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-between">
                    <div>
                      <span className="capitalize">{task.entity_type}</span> · 
                      <span className="text-xs font-mono">{task.entity_id}</span>
                    </div>
                    <div>
                      {task.priority && (
                        <Badge variant="outline" className="text-xs">
                          Priority: {task.priority >= 10 ? 'High' : task.priority <= 1 ? 'Low' : 'Normal'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {task.error && (
                    <div className="mt-2 text-xs text-red-500 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {task.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSyncStatus;
