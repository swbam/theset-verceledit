import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createMiddleware } from "../_shared/middleware.ts";
import { handleError, AppError, ValidationError } from "../_shared/error-handling.ts";
import { Artist } from "../_shared/types.ts";

interface ExternalIds {
  spotifyId?: string;
  ticketmasterId?: string;
  setlistFmMbid?: string;
}

// Improved API service objects with cleaner separation of concerns
class SpotifyService {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  async getToken(): Promise<string | null> {
    // Return cached token if still valid
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(this.clientId + ':' + this.clientSecret)
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new AppError(
        `Failed to get Spotify token: ${response.statusText}`,
        response.status,
        { functionName: 'SpotifyService.getToken' }
      );
    }

    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Expire 1 minute early for safety

    return this.token;
  }

  async searchArtist(name: string): Promise<any> {
    const token = await this.getToken();
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new AppError(
        `Spotify API error: ${response.statusText}`,
        response.status,
        { functionName: 'SpotifyService.searchArtist', entityType: 'artist', additionalInfo: { name } }
      );
    }

    const data = await response.json();
    return data?.artists?.items?.[0] || null;
  }

  transformArtistData(spotifyData: any): Partial<Artist> {
    if (!spotifyData) return {};

    // Get highest resolution image
    const imageUrl = spotifyData.images?.reduce((prev: any, current: any) =>
      (prev?.width || 0) > (current?.width || 0) ? prev : current
    )?.url;

    return {
      name: spotifyData.name,
      image_url: imageUrl || undefined,
      url: spotifyData.external_urls?.spotify || undefined,
      spotify_id: spotifyData.id || undefined,
      spotify_url: spotifyData.external_urls?.spotify || null,
      genres: spotifyData.genres || [],
      popularity: spotifyData.popularity || null,
      followers: spotifyData.followers?.total || null,
      updated_at: new Date().toISOString(),
      // Ensure these fields are explicitly set
      setlist_fm_mbid: null,
      setlist_fm_id: null,
    };
  }
}

class TicketmasterService {
  constructor(private readonly apiKey: string) {}

  async getArtist(id: string): Promise<any> {
    const url = `https://app.ticketmaster.com/discovery/v2/attractions/${id}.json?apikey=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new AppError(
        `Ticketmaster API error: ${response.statusText}`,
        response.status,
        { functionName: 'TicketmasterService.getArtist', entityType: 'artist', entityId: id }
      );
    }

    return await response.json();
  }

  transformArtistData(tmData: any): Partial<Artist> {
    if (!tmData) return {};

    return {
      name: tmData.name,
      image_url: this.getBestImage(tmData.images) || undefined,
      url: tmData.url || undefined,
      ticketmaster_id: tmData.id,
      updated_at: new Date().toISOString(),
      // Ensure these fields are explicitly set
      spotify_id: undefined,
      spotify_url: undefined,
      setlist_fm_mbid: undefined,
      setlist_fm_id: undefined
    };
  }

  private getBestImage(images?: Array<{url: string, width: number, height: number}>): string | undefined {
    if (!images || images.length === 0) return undefined;
    const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
    return sorted[0].url;
  }
}

class SetlistFmService {
  constructor(private readonly apiKey: string) {}

  async searchArtist(name: string): Promise<string | null> {
    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(name)}&sort=relevance`,
      {
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new AppError(
        `Setlist.fm API error: ${response.statusText}`,
        response.status,
        { functionName: 'SetlistFmService.searchArtist', entityType: 'artist', additionalInfo: { name } }
      );
    }

    const data = await response.json();
    return data.artist?.[0]?.mbid ?? null;
  }
}

class ArtistSynchronizer {
  private supabase: SupabaseClient;
  private spotify: SpotifyService;
  private ticketmaster: TicketmasterService;
  private setlistFm: SetlistFmService;

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize API services
    this.spotify = new SpotifyService(
      Deno.env.get('SPOTIFY_CLIENT_ID') ?? '',
      Deno.env.get('SPOTIFY_CLIENT_SECRET') ?? ''
    );

    this.ticketmaster = new TicketmasterService(
      Deno.env.get('TICKETMASTER_API_KEY') ?? ''
    );

    this.setlistFm = new SetlistFmService(
      Deno.env.get('SETLIST_FM_API_KEY') ?? ''
    );
  }

  async syncArtist(artistId: string): Promise<Artist> {
    console.log(`Starting sync for artist ${artistId}`);

    // Check if artist exists in database
    const { data: existingArtist, error: existingError } = await this.supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new AppError(
        `Error fetching existing artist`,
        500,
        { functionName: 'ArtistSynchronizer.syncArtist', entityType: 'artist', entityId: artistId, additionalInfo: { error: existingError } }
      );
    }

    // Initialize artist data with existing data or defaults
    let artistData: Artist = existingArtist as Artist || {
      name: '',
      image_url: null,
      url: null,
      spotify_id: null,
      spotify_url: null,
      genres: [],
      popularity: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      setlist_fm_mbid: null,
      setlist_fm_id: null,
      ticketmaster_id: artistId,
      followers: null,
      stored_tracks: null
    };

    // Synchronize with Ticketmaster
    try {
      const tmData = await this.ticketmaster.getArtist(artistId);
      Object.assign(artistData, this.ticketmaster.transformArtistData(tmData));
    } catch (error) {
      console.warn(`Ticketmaster sync failed for artist ${artistId}:`, error);
      // Continue with other API syncs
    }

    // If we now have a name, sync with other APIs
    if (artistData.name) {
      // Parallel API fetches
      const [spotifyResult, setlistResult] = await Promise.allSettled([
        // Spotify sync
        (async () => {
          const spotifyArtist = await this.spotify.searchArtist(artistData.name!);
          return this.spotify.transformArtistData(spotifyArtist);
        })(),

        // Setlist.fm sync
        (async () => {
          const mbid = await this.setlistFm.searchArtist(artistData.name!);
          return mbid ? { setlist_fm_mbid: mbid, setlist_fm_id: mbid } : {};
        })()
      ]);

      // Apply results from successful API calls
      if (spotifyResult.status === 'fulfilled') {
        Object.assign(artistData, spotifyResult.value);
      } else {
        console.warn(`Spotify sync failed for artist ${artistData.name}:`, spotifyResult.reason);
      }

      if (setlistResult.status === 'fulfilled') {
        Object.assign(artistData, setlistResult.value);
      } else {
        console.warn(`Setlist.fm sync failed for artist ${artistData.name}:`, setlistResult.reason);
      }
    } else {
      throw new ValidationError(
        `Could not determine artist name for ID ${artistId}`,
        { functionName: 'ArtistSynchronizer.syncArtist', entityType: 'artist', entityId: artistId }
      );
    }

    // Update the database
    artistData.updated_at = new Date().toISOString();
    const { error: upsertError } = await this.supabase
      .from('artists')
      .upsert(artistData);

    if (upsertError) {
      throw new AppError(
        `Failed to upsert artist data`,
        500,
        { functionName: 'ArtistSynchronizer.syncArtist', entityType: 'artist', entityId: artistId, additionalInfo: { error: upsertError } }
      );
    }

    // Update sync state
    await this.updateSyncStatus(artistId, 'artist');

    // Get artist's upcoming shows from Ticketmaster
    let shows = [];
    try {
      const showsResponse = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${Deno.env.get('TICKETMASTER_API_KEY')}&attractionId=${artistId}&size=20`
      );

      if (showsResponse.ok) {
        const showsData = await showsResponse.json();
        shows = showsData._embedded?.events || [];
      }
    } catch (error) {
      console.warn(`Failed to fetch shows for artist ${artistId}:`, error);
    }

    console.log(`Successfully synced artist ${artistId} with ${shows.length} shows`);
    return {
      ...artistData,
      shows
    };
  }

   private async updateSyncStatus(artistId: string, entityType: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      const { error } = await this.supabase
        .from('sync_states')
        .upsert({
          entity_id: artistId,
          entity_type: entityType,
          ticketmaster_id: artistId,
          last_synced: now,
          sync_version: 1 // Current sync version
        }, {
          onConflict: 'entity_id,entity_type'
        });

      if (error) {
        console.error(`Error updating sync state for ${entityType} ${artistId}:`, error);
      }
    } catch (error) {
      console.error(`Exception updating sync state for ${entityType} ${artistId}:`, error);
    }
  }
}

// Set up middleware for authentication and rate limiting
const middleware = createMiddleware({
  requireAuth: true,
  rateLimit: {
    requests: 10,
    window: 60 // 60 seconds
  }
});

serve(async (req: Request) => {
  console.log('--- sync-artist function handler started ---');

  // Apply middleware
  const middlewareResponse = await middleware(req);
  if (middlewareResponse) return middlewareResponse;

  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Parse request body
    const { artistId } = await req.json();

    if (!artistId) {
      throw new ValidationError('Artist ID is required');
    }

    // Initialize synchronizer and process artist
    const synchronizer = new ArtistSynchronizer();
    const artistData = await synchronizer.syncArtist(artistId);

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: artistData
      }),
      { headers, status: 200 }
    );
  } catch (error) {
    // Let error handler create appropriate response
    return handleError(error, createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    ));
  }
});
```

<write_to_file>
<path>supabase/functions/sync-artist/improved-index.ts</path>
<content>
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createMiddleware } from "../_shared/middleware.ts";
import { handleError, AppError, ValidationError } from "../_shared/error-handling.ts";
import { Artist } from "../_shared/types.ts";

interface ExternalIds {
  spotifyId?: string;
  ticketmasterId?: string;
  setlistFmMbid?: string;
}

// Improved API service objects with cleaner separation of concerns
class SpotifyService {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  async getToken(): Promise<string | null> {
    // Return cached token if still valid
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(this.clientId + ':' + this.clientSecret)
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new AppError(
        `Failed to get Spotify token: ${response.statusText}`,
        response.status,
        { functionName: 'SpotifyService.getToken' }
      );
    }

    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Expire 1 minute early for safety

    return this.token;
  }

  async searchArtist(name: string): Promise<any> {
    const token = await this.getToken();
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new AppError(
        `Spotify API error: ${response.statusText}`,
        response.status,
        { functionName: 'SpotifyService.searchArtist', entityType: 'artist', additionalInfo: { name } }
      );
    }

    const data = await response.json();
    return data?.artists?.items?.[0] || null;
  }

  transformArtistData(spotifyData: any): Partial<Artist> {
    if (!spotifyData) return {};

    // Get highest resolution image
    const imageUrl = spotifyData.images?.reduce((prev: any, current: any) =>
      (prev?.width || 0) > (current?.width || 0) ? prev : current
    )?.url;

    return {
      name: spotifyData.name,
      image_url: imageUrl || undefined,
      url: spotifyData.external_urls?.spotify || undefined,
      spotify_id: spotifyData.id || undefined,
      spotify_url: spotifyData.external_urls?.spotify || null,
      genres: spotifyData.genres || [],
      popularity: spotifyData.popularity || null,
      followers: spotifyData.followers?.total || null,
      updated_at: new Date().toISOString(),
      // Ensure these fields are explicitly set
      setlist_fm_mbid: null,
      setlist_fm_id: null,
    };
  }
}

class TicketmasterService {
  constructor(private readonly apiKey: string) {}

  async getArtist(id: string): Promise<any> {
    const url = `https://app.ticketmaster.com/discovery/v2/attractions/${id}.json?apikey=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new AppError(
        `Ticketmaster API error: ${response.statusText}`,
        response.status,
        { functionName: 'TicketmasterService.getArtist', entityType: 'artist', entityId: id }
      );
    }

    return await response.json();
  }

  transformArtistData(tmData: any): Partial<Artist> {
    if (!tmData) return {};

    return {
      name: tmData.name,
      image_url: this.getBestImage(tmData.images) || undefined,
      url: tmData.url || undefined,
      ticketmaster_id: tmData.id,
      updated_at: new Date().toISOString(),
      // Ensure these fields are explicitly set
      spotify_id: undefined,
      spotify_url: undefined,
      setlist_fm_mbid: undefined,
      setlist_fm_id: undefined
    };
  }

  private getBestImage(images?: Array<{url: string, width: number, height: number}>): string | undefined {
    if (!images || images.length === 0) return undefined;
    const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
    return sorted[0].url;
  }
}

class SetlistFmService {
  constructor(private readonly apiKey: string) {}

  async searchArtist(name: string): Promise<string | null> {
    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(name)}&sort=relevance`,
      {
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new AppError(
        `Setlist.fm API error: ${response.statusText}`,
        response.status,
        { functionName: 'SetlistFmService.searchArtist', entityType: 'artist', additionalInfo: { name } }
      );
    }

    const data = await response.json();
    return data.artist?.[0]?.mbid ?? null;
  }
}

class ArtistSynchronizer {
  private supabase: SupabaseClient;
  private spotify: SpotifyService;
  private ticketmaster: TicketmasterService;
  private setlistFm: SetlistFmService;

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize API services
    this.spotify = new SpotifyService(
      Deno.env.get('SPOTIFY_CLIENT_ID') ?? '',
      Deno.env.get('SPOTIFY_CLIENT_SECRET') ?? ''
    );

    this.ticketmaster = new TicketmasterService(
      Deno.env.get('TICKETMASTER_API_KEY') ?? ''
    );

    this.setlistFm = new SetlistFmService(
      Deno.env.get('SETLIST_FM_API_KEY') ?? ''
    );
  }

  async syncArtist(artistId: string): Promise<Artist> {
    console.log(`Starting sync for artist ${artistId}`);

    // Check if artist exists in database
    const { data: existingArtist, error: existingError } = await this.supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new AppError(
        `Error fetching existing artist`,
        500,
        { functionName: 'ArtistSynchronizer.syncArtist', entityType: 'artist', entityId: artistId, additionalInfo: { error: existingError } }
      );
    }

    // Initialize artist data with existing data or defaults
    let artistData: Artist = existingArtist as Artist || {
      name: '',
      image_url: null,
      url: null,
      spotify_id: null,
      spotify_url: null,
      genres: [],
      popularity: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      setlist_fm_mbid: null,
      setlist_fm_id: null,
      ticketmaster_id: artistId,
      followers: null,
      stored_tracks: null
    };

    // Synchronize with Ticketmaster
    try {
      const tmData = await this.ticketmaster.getArtist(artistId);
      Object.assign(artistData, this.ticketmaster.transformArtistData(tmData));
    } catch (error) {
      console.warn(`Ticketmaster sync failed for artist ${artistId}:`, error);
      // Continue with other API syncs
    }

    // If we now have a name, sync with other APIs
    if (artistData.name) {
      // Parallel API fetches
      const [spotifyResult, setlistResult] = await Promise.allSettled([
        // Spotify sync
        (async () => {
          const spotifyArtist = await this.spotify.searchArtist(artistData.name!);
          return this.spotify.transformArtistData(spotifyArtist);
        })(),

        // Setlist.fm sync
        (async () => {
          const mbid = await this.setlistFm.searchArtist(artistData.name!);
          return mbid ? { setlist_fm_mbid: mbid, setlist_fm_id: mbid } : {};
        })()
      ]);

      // Apply results from successful API calls
      if (spotifyResult.status === 'fulfilled') {
        Object.assign(artistData, spotifyResult.value);
      } else {
        console.warn(`Spotify sync failed for artist ${artistData.name}:`, spotifyResult.reason);
      }

      if (setlistResult.status === 'fulfilled') {
        Object.assign(artistData, setlistResult.value);
      } else {
        console.warn(`Setlist.fm sync failed for artist ${artistData.name}:`, setlistResult.reason);
      }
    } else {
      throw new ValidationError(
        `Could not determine artist name for ID ${artistId}`,
        { functionName: 'ArtistSynchronizer.syncArtist', entityType: 'artist', entityId: artistId }
      );
    }

    // Update the database
    artistData.updated_at = new Date().toISOString();
    const { error: upsertError } = await this.supabase
      .from('artists')
      .upsert(artistData);

    if (upsertError) {
      throw new AppError(
        `Failed to upsert artist data`,
        500,
        { functionName: 'ArtistSynchronizer.syncArtist', entityType: 'artist', entityId: artistId, additionalInfo: { error: upsertError } }
      );
    }

    // Update sync state
    await this.updateSyncStatus(artistId, 'artist');

    // Get artist's upcoming shows from Ticketmaster
    let shows = [];
    try {
      const showsResponse = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${Deno.env.get('TICKETMASTER_API_KEY')}&attractionId=${artistId}&size=20`
      );

      if (showsResponse.ok) {
        const showsData = await showsResponse.json();
        shows = showsData._embedded?.events || [];
      }
    } catch (error) {
      console.warn(`Failed to fetch shows for artist ${artistId}:`, error);
    }

    console.log(`Successfully synced artist ${artistId} with ${shows.length} shows`);
    return {
      ...artistData,
      shows
    };
  }

   private async updateSyncStatus(artistId: string, entityType: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      const { error } = await this.supabase
        .from('sync_states')
        .upsert({
          entity_id: artistId,
          entity_type: entityType,
          ticketmaster_id: artistId,
          last_synced: now,
          sync_version: 1 // Current sync version
        }, {
          onConflict: 'entity_id,entity_type'
        });

      if (error) {
        console.error(`Error updating sync state for ${entityType} ${artistId}:`, error);
      }
    } catch (error) {
      console.error(`Exception updating sync state for ${entityType} ${artistId}:`, error);
    }
  }
}

// Set up middleware for authentication and rate limiting
const middleware = createMiddleware({
  requireAuth: true,
  rateLimit: {
    requests: 10,
    window: 60 // 60 seconds
  }
});

serve(async (req: Request) => {
  console.log('--- sync-artist function handler started ---');

  // Apply middleware
  const middlewareResponse = await middleware(req);
  if (middlewareResponse) return middlewareResponse;

  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Parse request body
    const { artistId } = await req.json();

    if (!artistId) {
      throw new ValidationError('Artist ID is required');
    }

    // Initialize synchronizer and process artist
    const synchronizer = new ArtistSynchronizer();
    const artistData = await synchronizer.syncArtist(artistId);

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: artistData
      }),
      { headers, status: 200 }
    );
  } catch (error) {
    // Let error handler create appropriate response
    return handleError(error, createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    ));
  }
});
```

<write_to_file>
<path>supabase/functions/sync-artist/improved-index.ts</path>
<content>
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createMiddleware } from "../_shared/middleware.ts";
import { handleError, AppError, ValidationError } from "../_shared/error-handling.ts";
import { Artist } from "../_shared/types.ts";

interface ExternalIds {
  spotifyId?: string;
  ticketmasterId?: string;
  setlistFmMbid?: string;
}

// Improved API service objects with cleaner separation of concerns
class SpotifyService {
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  async getToken(): Promise<string | null> {
    // Return cached token if still valid
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(this.clientId + ':' + this.clientSecret)
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new AppError(
        `Failed to get Spotify token: ${response.statusText}`,
        response.status,
        { functionName: 'SpotifyService.getToken' }
      );
    }

    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Expire 1 minute early for safety

    return this.token;
  }

  async searchArtist(name: string): Promise<any> {
    const token = await this.getToken();
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new AppError(
        `Spotify API error: ${response.statusText}`,
        response.status,
        { functionName: 'SpotifyService.searchArtist', entityType: 'artist', additionalInfo: { name } }
      );
    }

    const data = await response.json();
    return data?.artists?.items?.[0] || null;
  }

  transformArtistData(spotifyData: any): Partial<Artist> {
    if (!spotifyData) return {};

    // Get highest resolution image
    const imageUrl = spotifyData.images?.reduce((prev: any, current: any) =>
      (prev?.width || 0) > (current?.width || 0) ? prev : current
    )?.url;

    return {
      name: spotifyData.name,
      image_url: imageUrl || undefined,
      url: spotifyData.external_urls?.spotify || undefined,
      spotify_id: spotifyData.id || undefined,
      spotify_url: spotifyData.external_urls?.spotify || null,
      genres: spotifyData.genres || [],
      popularity: spotifyData.popularity || null,
      followers: spotifyData.followers?.total || null,
      updated_at: new Date().toISOString(),
      // Ensure these fields are explicitly set
      setlist_fm_mbid: null,
      setlist_fm_id: null,
    };
  }
}

class TicketmasterService {
  constructor(private readonly apiKey: string) {}

  async getArtist(id: string): Promise<any> {
    const url = `https://app.ticketmaster.com/discovery/v2/attractions/${id}.json?apikey=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new AppError(
        `Ticketmaster API error: ${response.statusText}`,
        response.status,
        { functionName: 'TicketmasterService.getArtist', entityType: 'artist', entityId: id }
      );
    }

    return await response.json();
  }

  transformArtistData(tmData: any): Partial<Artist> {
    if (!tmData) return {};

    return {
      name: tmData.name,
      image_url: this.getBestImage(tmData.images) || undefined,
      url: tmData.url || undefined,
      ticketmaster_id: tmData.id,
      updated_at: new Date().toISOString(),
      // Ensure these fields are explicitly set
      spotify_id: undefined,
      spotify_url: undefined,
      setlist_fm_mbid: undefined,
      setlist_fm_id: undefined
    };
  }

  private getBestImage(images?: Array<{url: string, width: number, height: number}>): string | undefined {
    if (!images || images.length === 0) return undefined;
    const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
    return sorted[0].url;
  }
}

class SetlistFmService {
  constructor(private readonly apiKey: string) {}

  async searchArtist(name: string): Promise<string | null> {
    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(name)}&sort=relevance`,
      {
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new AppError(
        `Setlist.fm API error: ${response.statusText}`,
        response.status,
        { functionName: 'SetlistFmService.searchArtist', entityType: 'artist', additionalInfo: { name } }
      );
    }

    const data = await response.json();
    return data.artist?.[0]?.mbid ?? null;
  }
}

class ArtistSynchronizer {
  private supabase: SupabaseClient;
  private spotify: SpotifyService;
  private ticketmaster: TicketmasterService;
  private setlistFm: SetlistFmService;

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize API services
    this.spotify = new SpotifyService(
      Deno.env.get('SPOTIFY_CLIENT_ID') ?? '',
      Deno.env.get('SPOTIFY_CLIENT_SECRET') ?? ''
    );

    this.ticketmaster = new TicketmasterService(
      Deno.env.get('TICKETMASTER_API_KEY') ?? ''
    );

    this.setlistFm = new SetlistFmService(
      Deno.env.get('SETLIST_FM_API_KEY') ?? ''
    );
  }

  async syncArtist(artistId: string): Promise<Artist> {
    console.log(`Starting sync for artist ${artistId}`);

    // Check if artist exists in database
    const { data: existingArtist, error: existingError } = await this.supabase
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .single();

    if (existingArtist) {
      // If artist exists, update it
      let artistData: Artist = existingArtist as Artist;

      // Synchronize with Ticketmaster
      try {
        const tmData = await this.ticketmaster.getArtist(artistId);
        Object.assign(artistData, this.ticketmaster.transformArtistData(tmData));
      } catch (error) {
        console.warn(`Ticketmaster sync failed for artist ${artistId}:`, error);
        // Continue with other API syncs
      }

      // If we now have a name, sync with other APIs
      if (artistData.name) {
        // Parallel API fetches
        const [spotifyResult, setlistResult] = await Promise.allSettled([
          // Spotify sync
          (async () => {
            const spotifyArtist = await this.spotify.searchArtist(artistData.name!);
            return this.spotify.transformArtistData(spotifyArtist);
          })(),

          // Setlist.fm sync
          (async () => {
            const mbid = await this.setlistFm.searchArtist(artistData.name!);
            return mbid ? { setlist_fm_mbid: mbid, setlist_fm_id: mbid } : {};
          })()
        ]);

        // Apply results from successful API calls
        if (spotifyResult.status === 'fulfilled') {
          Object.assign(artistData, spotifyResult.value);
        } else {
          console.warn(`Spotify sync failed for artist ${artistData.name}:`, spotifyResult.reason);
        }

        if (setlistResult.status === 'fulfilled') {
          Object.assign(artistData, setlistResult.value);
        } else {
          console.warn(`Setlist.fm sync failed for artist ${artistData.name}:`, setlistResult.reason);
        }
      } else {
        throw new ValidationError(
          `Could not determine artist name for ID ${artistId}`,
          { functionName: 'ArtistSynchronizer.syncArtist', entityType: 'artist', entityId: artistId }
        );
      }

      // Update the database
      artistData.updated_at = new Date().toISOString();
      const { error: upsertError } = await this.supabase
        .from('artists')
        .upsert(artistData);

      if (upsertError) {
        throw new AppError(
          `Failed to upsert artist data`,
          500,
          { functionName: 'ArtistSynchronizer.syncArtist', entityType: 'artist', entityId: artistId, additionalInfo: { error: upsertError } }
        );
      }

      // Update sync state
      await this.updateSyncStatus(artistId, 'artist');

      // Get artist's upcoming shows from Ticketmaster
      let shows = [];
      try {
        const showsResponse = await fetch(
          `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${Deno.env.get('TICKETMASTER_API_KEY')}&attractionId=${artistId}&size=20`
        );

        if (showsResponse.ok) {
          const showsData = await showsResponse.json();
          shows = showsData._embedded?.events || [];
        }
      } catch (error) {
        console.warn(`Failed to fetch shows for artist ${artistId}:`, error);
      }

      console.log(`Successfully synced artist ${artistId} with ${shows.length} shows`);
      return {
        ...artistData,
        shows
      };

    } else if (existingError && existingError.code === 'PGRST116') {
      // If artist does not exist, create it
      let artistData: Artist = {
        name: '', // Will be populated by API calls
        image_url: null,
        url: null,
        spotify_id: null,
        spotify_url: null,
        genres: [],
        popularity: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        setlist_fm_mbid: null,
        setlist_fm_id: null,
        ticketmaster_id: artistId,
        followers: null,
        stored_tracks: null
      };

      // Synchronize with Ticketmaster
      try {
        const tmData = await this.ticketmaster.getArtist(artistId);
        Object.assign(artistData, this.ticketmaster.transformArtistData(tmData));
      } catch (error) {
        console.warn(`Ticketmaster sync failed for artist ${artistId}:`, error);
        // Continue with other API syncs
      }

      // If we now have a name, sync with other APIs
      if (artistData.name) {
        // Parallel API fetches
        const [spotifyResult, setlistResult] = await Promise.allSettled([
          // Spotify sync
          (async () => {
            const spotifyArtist = await this.spotify.searchArtist(artistData.name!);
            return this.spotify.transformArtistData(spotifyArtist);
          })(),

          // Setlist.fm sync
          (async () => {
            const mbid = await this.setlistFm.searchArtist(artistData.name!);
            return mbid ? { setlist_fm_mbid: mbid, setlist_fm_id: mbid } : {};
          })()
        ]);

        // Apply results from successful API calls
        if (spotifyResult.status === 'fulfilled') {
          Object.assign(artistData, spotifyResult.value);
        } else {
          console.warn(`Spotify sync failed for artist ${artistData.name}:`, spotifyResult.reason);
        }

        if (setlistResult.status === 'fulfilled') {
          Object.assign(artistData, setlistResult.value);
        } else {
          console.warn(`Setlist.fm sync failed for artist ${artistData.name}:`, setlistResult.reason);
        }
      } else {
        throw new ValidationError(
          `Could not determine artist name for ID ${artistId}`,
          { functionName: 'ArtistSynchronizer.syncArtist', entityType: 'artist', entityId: artistId }
        );
      }

      // Insert into the database
      const { data: newArtist, error: insertError } = await this.supabase
        .from('artists')
        .insert([artistData])
        .select()
        .single();

      if (insertError) {
        throw new AppError(
          `Failed to insert new artist data`,
          500,
          { functionName: 'ArtistSynchronizer.syncArtist', entityType: 'artist', entityId: artistId, additionalInfo: { error: insertError } }
        );
      }

      // Update sync state
      await this.updateSyncStatus(newArtist.id, 'artist');

      // Get artist's upcoming shows from Ticketmaster
      let shows = [];
      try {
        const showsResponse = await fetch(
          `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${Deno.env.get('TICKETMASTER_API_KEY')}&attractionId=${artistId}&size=20`
        );

        if (showsResponse.ok) {
          const showsData = await showsResponse.json();
          shows = showsData._embedded?.events || [];
        }
      } catch (error) {
        console.warn(`Failed to fetch shows for artist ${artistId}:`, error);
      }

      console.log(`Successfully synced artist ${artistId} with ${shows.length} shows`);
      return {
        ...newArtist,
        shows
      };

    } else {
      // Handle other potential errors during the initial fetch
      throw new AppError(
        `Unexpected error fetching artist`,
        500,
        { functionName: 'ArtistSynchronizer.syncArtist', entityType: 'artist', entityId: artistId, additionalInfo: { error: existingError } }
      );
    }
  }

   private async updateSyncStatus(artistId: string, entityType: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      const { error } = await this.supabase
        .from('sync_states')
        .upsert({
          entity_id: artistId,
          entity_type: entityType,
          ticketmaster_id: artistId,
          last_synced: now,
          sync_version: 1 // Current sync version
        }, {
          onConflict: 'entity_id,entity_type'
        });

      if (error) {
        console.error(`Error updating sync state for ${entityType} ${artistId}:`, error);
      }
    } catch (error) {
      console.error(`Exception updating sync state for ${entityType} ${artistId}:`, error);
    }
  }
}

// Set up middleware for authentication and rate limiting
const middleware = createMiddleware({
  requireAuth: true,
  rateLimit: {
    requests: 10,
    window: 60 // 60 seconds
  }
});

serve(async (req: Request) => {
  console.log('--- sync-artist function handler started ---');

  // Apply middleware
  const middlewareResponse = await middleware(req);
  if (middlewareResponse) return middlewareResponse;

  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Parse request body
    const { artistId } = await req.json();

    if (!artistId) {
      throw new ValidationError('Artist ID is required');
    }

    // Initialize synchronizer and process artist
    const synchronizer = new ArtistSynchronizer();
    const artistData = await synchronizer.syncArtist(artistId);

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: artistData
      }),
      { headers, status: 200 }
    );
  } catch (error) {
    // Let error handler create appropriate response
    return handleError(error, createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    ));
  }
});