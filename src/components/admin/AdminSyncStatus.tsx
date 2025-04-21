import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";

export default function AdminSyncStatus() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [syncStates, setSyncStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSyncStates();
  }, []);

  async function fetchSyncStates() {
    try {
      const { data, error } = await supabase
        .from('sync_states')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSyncStates(data || []);
    } catch (err) {
      console.error('Error fetching sync states:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sync states');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadgeColor(status: string) {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  }

  if (loading) return <div>Loading sync status...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Sync Status</h2>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
        </TabsList>

        {['all', 'completed', 'failed', 'in_progress'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <div className="space-y-4">
              {syncStates
                .filter(state => tab === 'all' || state.status.toLowerCase() === tab)
                .map((state) => (
                  <div
                    key={state.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {state.entity_type} Sync
                          <Badge 
                            className={`ml-2 ${getStatusBadgeColor(state.status)}`}
                          >
                            {state.status}
                          </Badge>
                        </h3>
                        <p className="text-sm text-gray-500">
                          {format(new Date(state.created_at), 'PPpp')}
                          {' '}
                          ({formatDistanceToNow(new Date(state.created_at), { addSuffix: true })})
                        </p>
                      </div>
                      {state.next_sync_at && (
                        <div className="text-sm text-gray-500">
                          Next sync: {format(new Date(state.next_sync_at), 'PPpp')}
                        </div>
                      )}
                    </div>

                    {state.error_message && (
                      <div className="text-sm text-red-500">
                        Error: {state.error_message}
                      </div>
                    )}

                    {state.metadata && (
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(state.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
