import React, { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Search, Loader2, CloudUpload, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface SpotifyArtist {
  id: string;
  name: string;
  images?: { url: string }[];
  genres?: string[];
  popularity?: number;
  followers?: { total: number };
}

interface SyncResult {
  artistSpotifyId: string;
  success: boolean;
  error?: string;
}

const AdminArtists = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});

  // Search Spotify for artists (via backend proxy for auth)
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setArtists([]);
    try {
      const res = await fetch(`/api/spotify-search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to search Spotify");
      setArtists(data.artists || []);
      if ((data.artists || []).length === 0) toast.info("No artists found.");
    } catch (err) {
      toast.error("Search failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // Upsert artist in Supabase, then sync using new unified sync function
  const handleSync = async (artist: SpotifyArtist) => {
    setSyncing(artist.id);
    setSyncResults((prev) => ({ ...prev, [artist.id]: { artistSpotifyId: artist.id, success: false } }));
    toast.loading(`Syncing ${artist.name}...`);
    try {
      // 1. Upsert artist in Supabase
      const upsertRes = await fetch("/api/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotify_id: artist.id,
          name: artist.name,
          image_url: artist.images?.[0]?.url,
          genres: artist.genres,
          followers: artist.followers?.total,
          popularity: artist.popularity,
        }),
      });
      const upsertData = await upsertRes.json();
      if (!upsertRes.ok || !upsertData.id) throw new Error(upsertData.error || "Failed to upsert artist");

      // 2. Call unified-sync with the new artist UUID
      const res = await fetch("/api/unified-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer admin" },
        body: JSON.stringify({ entityType: "artist", entityId: upsertData.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Sync failed");
      setSyncResults((prev) => ({ ...prev, [artist.id]: { artistSpotifyId: artist.id, success: true } }));
      toast.success(`Sync complete for ${artist.name}`);
    } catch (err) {
      setSyncResults((prev) => ({
        ...prev,
        [artist.id]: { artistSpotifyId: artist.id, success: false, error: err instanceof Error ? err.message : "Unknown error" },
      }));
      toast.error(`Sync failed for ${artist.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Import & Sync Artists</h2>
        <div className="text-sm text-muted-foreground">Imports artist, shows, and song catalog from Spotify & Ticketmaster</div>
      </div>
      <form onSubmit={handleSearch} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Spotify for artists..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading || !searchQuery.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Search
        </Button>
      </form>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Genres</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">Loading...</TableCell>
              </TableRow>
            ) : artists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  Enter a query to search for artists.
                </TableCell>
              </TableRow>
            ) : (
              artists.map((artist) => (
                <TableRow key={artist.id}>
                  <TableCell>
                    <Avatar>
                      <AvatarImage src={artist.images?.[0]?.url} />
                      <AvatarFallback>{artist.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{artist.name}</TableCell>
                  <TableCell>{artist.genres?.join(", ")}</TableCell>
                  <TableCell>{artist.followers?.total?.toLocaleString() || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(artist)}
                      disabled={!!syncing}
                    >
                      {syncing === artist.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : syncResults[artist.id]?.success ? (
                        <>
                          <Check className="mr-2 h-4 w-4 text-green-600" />
                          Synced
                        </>
                      ) : (
                        <>
                          <CloudUpload className="mr-2 h-4 w-4" />
                          Sync
                        </>
                      )}
                    </Button>
                    {syncResults[artist.id]?.error && (
                      <div className="text-xs text-red-600 mt-1">{syncResults[artist.id].error}</div>
                    )}
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

export default AdminArtists;
