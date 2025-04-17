import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface SyncStats {
  entity_type: string;
  total: number;
  last_24h: number;
  last_sync: string | null;
}

interface QueryResult {
  entity_type: string;
  total: string; // PostgreSQL COUNT returns string
  last_24h: string;
  last_sync: string | null;
}

const AdminSyncStatus = () => {
  const [stats, setStats] = useState<SyncStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT 
              entity_type::text,
              COUNT(*)::text as total,
              COUNT(*) FILTER (WHERE last_synced >= NOW() - INTERVAL '24 hours')::text as last_24h,
              MAX(last_synced) as last_sync
            FROM sync_states
            GROUP BY entity_type
          `
        });
      
      if (error) throw error;
      
      // Ensure we have entries for all entity types
      const entityTypes = ['artist', 'show', 'venue', 'song'];
      const results = (data as unknown as QueryResult[]) || [];
      const statsMap = new Map(results.map(s => [s.entity_type, s]));
      
      const fullStats = entityTypes.map(type => ({
        entity_type: type,
        total: parseInt(statsMap.get(type)?.total || '0', 10),
        last_24h: parseInt(statsMap.get(type)?.last_24h || '0', 10),
        last_sync: statsMap.get(type)?.last_sync || null
      }));

      setStats(fullStats);
    } catch (error) {
      console.error('Error fetching sync stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Set up auto-refresh every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
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
                  <dt className="text-sm text-muted-foreground">Total Synced:</dt>
                  <dd className="text-sm font-medium">{entityStats.total}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Last 24 Hours:</dt>
                  <dd className="text-sm font-medium">{entityStats.last_24h}</dd>
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
        <h3 className="text-lg font-semibold mb-4">Recent Sync Operations</h3>
        <div className="rounded-lg border bg-card">
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="text-sm text-muted-foreground">
                  <th className="text-left font-medium">Entity</th>
                  <th className="text-left font-medium">ID</th>
                  <th className="text-left font-medium">Status</th>
                  <th className="text-left font-medium">Last Updated</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-muted-foreground">
                      No recent sync operations
                    </td>
                  </tr>
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
