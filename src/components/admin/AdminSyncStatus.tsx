import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';

// Define known valid external IDs for testing (replace with actual valid IDs)
const TEST_IDS = {
  artist: 'K8vZ9175BhV', // Example: Coldplay TM ID
  venue: 'KovZpZAEkIIA', // Example: Madison Square Garden TM ID
  show: 'G5v0Z9JkNd7Pk', // Example: A specific event TM ID
  setlist: '33b6a49d', // Example: A specific setlist.fm ID (if setlist sync is implemented)
  song: '4u7EnebtmKWzUH433cf5Qv' // Example: A specific Spotify Song ID (if song sync is implemented)
};

const AdminSyncStatus = () => {
  const [syncingType, setSyncingType] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const fetchQueueStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch('/api/sync'); // GET request
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch queue status');
      }
      setQueueStatus(data.queueStatus);
    } catch (error) {
      console.error("Error fetching queue status:", error);
      toast.error(`Failed to fetch queue status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setQueueStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchQueueStatus();
    // Optional: Refresh status periodically
    // const interval = setInterval(fetchQueueStatus, 30000); // Refresh every 30s
    // return () => clearInterval(interval);
  }, [fetchQueueStatus]);

  const handleTestSync = async (entityType: keyof typeof TEST_IDS) => {
    const entityId = TEST_IDS[entityType];
    if (!entityId) {
      toast.error(`No test ID configured for entity type: ${entityType}`);
      return;
    }

    setSyncingType(entityType);
    const toastId = toast.loading(`Queueing test sync for ${entityType}: ${entityId}...`);
    console.log(`ADMIN TEST: Queueing sync task - Type: ${entityType}, ID: ${entityId}, Operation: create`);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: entityType,
          id: entityId,
          operation: 'create' // Use 'create' to ensure it fetches and upserts
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Sync request failed');
      }

      toast.success(`Sync task queued for ${entityType} ${entityId}.`, { id: toastId });
      fetchQueueStatus(); // Refresh queue status after queuing

    } catch (error) {
      console.error(`Error queuing test sync for ${entityType} ${entityId}:`, error);
      toast.error(`Failed to queue test sync: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setSyncingType(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Sync Queue Status</span>
            <Button size="sm" variant="outline" onClick={fetchQueueStatus} disabled={loadingStatus}>
              <RefreshCw className={`h-4 w-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <CardDescription>Overview of pending and active sync tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStatus ? (
            <div className="flex justify-center items-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : queueStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="font-medium">Pending:</span> {queueStatus.pending}</div>
              <div><span className="font-medium">Active:</span> {queueStatus.active}</div>
              <div className="col-span-2 md:col-span-1"><span className="font-medium">Max Concurrent:</span> {queueStatus.maxConcurrent}</div>
              <div className="col-span-2 md:col-span-4 mt-2 border-t pt-2">
                <h4 className="font-medium mb-1">Pending by Priority:</h4>
                <div className="flex gap-4">
                  <span>High: {queueStatus.byPriority?.high || 0}</span>
                  <span>Medium: {queueStatus.byPriority?.medium || 0}</span>
                  <span>Low: {queueStatus.byPriority?.low || 0}</span>
                </div>
              </div>
               <div className="col-span-2 md:col-span-4 mt-2 border-t pt-2">
                 <h4 className="font-medium mb-1">Pending by Type:</h4>
                 <div className="flex flex-wrap gap-x-4 gap-y-1">
                   {Object.entries(queueStatus.byType || {}).map(([type, count]) => (
                     <span key={type}>{type}: {count as number}</span>
                   ))}
                 </div>
               </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Could not load queue status.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trigger Test Syncs</CardTitle>
          <CardDescription>Queue a sync task for a specific entity type using a test ID.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(Object.keys(TEST_IDS) as Array<keyof typeof TEST_IDS>).map((type) => (
            <Button
              key={type}
              onClick={() => handleTestSync(type)}
              disabled={syncingType === type}
              variant="secondary"
            >
              {syncingType === type ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test {type.charAt(0).toUpperCase() + type.slice(1)} Sync
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSyncStatus;
