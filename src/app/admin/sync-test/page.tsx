'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { createClient } from '@supabase/supabase-js';

interface SyncLog {
  timestamp: string;
  step: string;
  status: 'success' | 'error' | 'info';
  details?: any;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminSyncTest() {
  const [artistName, setArtistName] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] [${type.toUpperCase()}] ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
    setError(null);
    setSyncStatus('idle');
  };

  const handleSync = async () => {
    if (!artistName.trim()) return;
    
    setIsLoading(true);
    setSyncStatus('syncing');
    setError(null);
    setLogs([]);
    addLog(`Starting sync for artist: ${artistName}`, 'info');
    
    try {
      const { data, error: functionInvokeError } = await supabase.functions.invoke('admin-sync-test', {
        body: { artistName }
      });

      if (functionInvokeError) {
        throw new Error(functionInvokeError.message || 'Function invocation failed');
      }

      if (data && data.error) {
        if (data.logs) {
          data.logs.forEach((log: SyncLog) => {
            addLog(`${log.step}: ${typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}`, log.status);
          });
        }
        throw new Error(data.error);
      }

      if (data && data.logs) {
        data.logs.forEach((log: SyncLog) => {
          addLog(`${log.step}: ${typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}`, log.status);
        });
      }

      addLog('Sync completed successfully', 'success');
      if (data && data.artist) {
        addLog(`Artist ID: ${data.artist.id}`, 'info');
      }
      if (data && data.counts) {
        addLog(`Songs imported: ${data.counts.songs}`, 'info');
        addLog(`Shows imported: ${data.counts.shows}`, 'info');
        addLog(`Setlists imported: ${data.counts.setlists}`, 'info');
      }
      setSyncStatus('success');
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setError(errorMessage);
      addLog(`Error: ${errorMessage}`, 'error');
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Sync Test</h1>
        <div className="flex items-center gap-2">
          {syncStatus === 'success' && (
            <Alert className="bg-green-500/10 text-green-500 border-green-500/20 py-2 px-4">
              <AlertDescription>Sync completed successfully</AlertDescription>
            </Alert>
          )}
          {syncStatus === 'error' && error && (
            <Alert className="bg-red-500/10 text-red-500 border-red-500/20 py-2 px-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
      
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
          variant={syncStatus === 'error' ? 'destructive' : 'default'}
        >
          {isLoading ? (
            <>
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            'Start Sync'
          )}
        </Button>
        <Button
          onClick={clearLogs}
          variant="outline"
          size="icon"
          title="Clear logs"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Sync Logs</h2>
          <div className="text-sm text-muted-foreground">
            {logs.length} log entries
          </div>
        </div>
        <ScrollArea className="h-[500px] w-full rounded-md border p-4">
          {logs.map((log, index) => {
            const isError = log.includes('[ERROR]');
            const isSuccess = log.includes('[SUCCESS]');
            return (
              <div
                key={index}
                className={`text-sm mb-2 font-mono ${
                  isError ? 'text-red-500' :
                  isSuccess ? 'text-green-500' :
                  'text-muted-foreground'
                }`}
              >
                {log}
              </div>
            );
          })}
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