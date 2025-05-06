'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminSyncTest() {
  const [artistName, setArtistName] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const handleSync = async () => {
    if (!artistName.trim()) return;
    
    setIsLoading(true);
    addLog(`Starting sync for artist: ${artistName}`);
    
    try {
      const response = await fetch('/api/admin/sync-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      addLog('Sync completed successfully');
      addLog(`Artist ID: ${data.artistId}`);
      addLog(`Songs imported: ${data.songsCount}`);
      addLog(`Shows imported: ${data.showsCount}`);
      addLog(`Setlists imported: ${data.setlistsCount}`);
    } catch (error) {
      addLog(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Sync Test</h1>
      
      <div className="flex gap-4 mb-8">
        <Input
          placeholder="Enter artist name"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          className="max-w-md"
        />
        <Button 
          onClick={handleSync}
          disabled={isLoading || !artistName.trim()}
        >
          {isLoading ? 'Syncing...' : 'Start Sync'}
        </Button>
      </div>

      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Sync Logs</h2>
        <ScrollArea className="h-[500px] w-full rounded-md border p-4">
          {logs.map((log, index) => (
            <div key={index} className="text-sm mb-2 font-mono">
              {log}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-muted-foreground text-center py-8">
              No logs yet. Start a sync to see detailed progress.
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
} 