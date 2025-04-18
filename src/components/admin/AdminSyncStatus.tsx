import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Play, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

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
      ['artist', 'show', 'venue', 'song'].forEach(type => {
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
          if (!lastSyncMap.has(task.entity_type)) {
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
          // Test artist sync
          response = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: 'artist',
              entityId: '1f9e8a14-7bca-4f1e-b2d3-431fe1e31595', // Coldplay
              priority: 'high',
              sync: ['artist', 'shows', 'songs']
            })
          });
          break;
          
        case 'show':
          // Test show sync
          response = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: 'show',
              entityId: 'vvG1iZ9aVt5jDk', // Some show ID
              priority: 'high'
            })
          });
          break;
          
        case 'pipeline':
          // Test entire sync pipeline
          response = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              test: true,
              fullPipeline: true
            })
          });
          break;
          
        default:
          throw new Error(`Unknown test type: ${testType}`);
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Test failed');
      }
      
      toast.success(`${testType} test started successfully`, { id: toastId });
      
      // Refresh data after a short delay
      setTimeout(() => {
        fetchStats();
        fetchRecentTasks();
      }, 2000);
      
    } catch (error) {
      console.error(`Error running ${testType} test:`, error);
      toast.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setTesting(prev => ({ ...prev, [testType]: false }));
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      case 'processing': return 'text-blue-500';
      case 'pending': return 'text-yellow-500';
      default: return '';
    }
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
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(entityStats => (
          <Card key={entityStats.entity_type}>
            <CardHeader>
              <CardTitle className="capitalize">{entityStats.entity_type}s</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Total Syncs:</dt>
                  <dd className="text-sm font-medium">{entityStats.total}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Pending/Processing:</dt>
                  <dd className="text-sm font-medium text-yellow-500">{entityStats.pending}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Completed:</dt>
                  <dd className="text-sm font-medium text-green-500">{entityStats.completed}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Failed:</dt>
                  <dd className="text-sm font-medium text-red-500">{entityStats.failed}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Last Sync:</dt>
                  <dd className="text-sm font-medium">{formatDate(entityStats.last_sync)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Test Sync System</h3>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => runTest('artist')}
              disabled={testing['artist']}
            >
              <Play className="mr-2 h-4 w-4" />
              Test Artist Sync
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => runTest('show')}
              disabled={testing['show']}
            >
              <Play className="mr-2 h-4 w-4" />
              Test Show Sync
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => runTest('pipeline')}
              disabled={testing['pipeline']}
            >
              <Play className="mr-2 h-4 w-4" />
              Test Full Pipeline
            </Button>
          </div>
        </div>
        <div className="rounded-lg border bg-card">
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="text-sm text-muted-foreground">
                  <th className="text-left font-medium">Entity</th>
                  <th className="text-left font-medium">ID</th>
                  <th className="text-left font-medium">Status</th>
                  <th className="text-left font-medium">Updated At</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {tasksLoading ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : recentTasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-muted-foreground">
                      No recent sync operations
                    </td>
                  </tr>
                ) : (
                  recentTasks.map(task => (
                    <tr key={task.id} className="border-t">
                      <td className="py-2 capitalize">{task.entity_type}</td>
                      <td className="py-2">
                        <span className="font-mono text-xs">{task.entity_id.substring(0, 13)}...</span>
                      </td>
                      <td className="py-2">
                        <span className={`capitalize ${getStatusColor(task.status)}`}>
                          {task.status}
                          {task.error && (
                            <span className="ml-2" title={task.error}>
                              <AlertTriangle className="inline h-3 w-3 text-red-500" />
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-2">{formatDate(task.updated_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSyncStatus;
