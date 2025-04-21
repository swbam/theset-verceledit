import React from 'react';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function SyncTestPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [entityType, setEntityType] = useState<'artist' | 'venue' | 'show' | 'song'>('artist');
  const [entityId, setEntityId] = useState('');
  const [entityName, setEntityName] = useState('');
  const [ticketmasterId, setTicketmasterId] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [options, setOptions] = useState({
    forceRefresh: false,
    skipDependencies: false
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSyncClick = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Create the payload based on the form inputs
      const payload = {
        entityType,
        entityId: entityId || undefined,
        entityName: entityName || undefined,
        ticketmasterId: ticketmasterId || undefined,
        spotifyId: spotifyId || undefined,
        options
      };

      // Call the unified-sync function
      const { data, error } = await supabase.functions.invoke('unified-sync', {
        body: payload,
      });

      if (error) {
        throw new Error(error.message || 'Unknown error occurred');
      }

      setResult(data);
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (option: keyof typeof options) => {
    setOptions({
      ...options,
      [option]: !options[option]
    });
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Sync Test Interface</h1>

      <Card className="p-6">
        <div className="grid gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity-type">Entity Type</Label>
              <Select value={entityType} onValueChange={(value: any) => setEntityType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="venue">Venue</SelectItem>
                  <SelectItem value="show">Show</SelectItem>
                  <SelectItem value="song">Song</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity-id">Entity ID (UUID)</Label>
              <Input
                id="entity-id"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="Leave blank to create new"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entity-name">Name</Label>
            <Input
              id="entity-name"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="Required for new entities"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticketmaster-id">Ticketmaster ID</Label>
              <Input
                id="ticketmaster-id"
                value={ticketmasterId}
                onChange={(e) => setTicketmasterId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spotify-id">Spotify ID</Label>
              <Input
                id="spotify-id"
                value={spotifyId}
                onChange={(e) => setSpotifyId(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant={options.forceRefresh ? "default" : "outline"}
              onClick={() => handleCheckboxChange('forceRefresh')}
            >
              Force Refresh: {options.forceRefresh ? "ON" : "OFF"}
            </Button>
            <Button
              variant={options.skipDependencies ? "default" : "outline"}
              onClick={() => handleCheckboxChange('skipDependencies')}
            >
              Skip Dependencies: {options.skipDependencies ? "ON" : "OFF"}
            </Button>
          </div>

          <Button
            onClick={handleSyncClick}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              'Start Sync'
            )}
          </Button>
        </div>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Sync Result</h2>
          <pre className="overflow-auto max-h-[500px] p-4 bg-muted rounded-lg">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
