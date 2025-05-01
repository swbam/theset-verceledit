import { createClient } from '@supabase/supabase-js';

// --- Client-Side Safe Configuration ---
const clientConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  // Add other client-safe configs here if needed
};

// --- Server-Side Only Configuration ---
// NEVER import this object in client-side code
const serverConfig = {
  supabase: {
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  ticketmaster: {
    apiKey: process.env.TICKETMASTER_API_KEY || '',
    baseUrl: 'https://app.ticketmaster.com/discovery/v2',
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    baseUrl: 'https://api.spotify.com/v1',
  },
  setlistFm: {
    // Standardize key name if possible across env and code
    apiKey: process.env.SETLISTFM_API_KEY || process.env.SETLIST_FM_API_KEY || '', 
    baseUrl: 'https://api.setlist.fm/rest/1.0',
  },
  cron: {
    secret: process.env.CRON_SECRET || '',
  },
  redis: {
    url: process.env.UPSTASH_REDIS_URL || '',
    token: process.env.UPSTASH_REDIS_TOKEN || '',
  },
  database: {
    url: process.env.SUPABASE_DB_URL || '', // For direct DB connections if needed
  },
  testing: {
    keepData: process.env.KEEP_TEST_DATA === 'true',
  },
  // Add other server-only configs here
};

// --- Validation Functions ---
const validateClientConfig = () => {
  const requiredVars = [
    ['NEXT_PUBLIC_SUPABASE_URL', clientConfig.supabase.url],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', clientConfig.supabase.anonKey],
  ];
  for (const [name, value] of requiredVars) {
    if (!value) {
      console.warn(`Missing client-side environment variable: ${name}`);
      // Decide if this should throw an error or just warn
      // throw new Error(`Missing required client environment variable: ${name}`);
    }
  }
};

const validateServerConfig = () => {
  // This should only run server-side
  if (typeof window !== 'undefined') return; 

  const requiredVars = [
    // Supabase service key is often needed for admin tasks
    ['SUPABASE_SERVICE_ROLE_KEY', serverConfig.supabase.serviceKey, 'Supabase service role key is required for admin operations'],
    ['TICKETMASTER_API_KEY', serverConfig.ticketmaster.apiKey, 'Ticketmaster API key is required for event data'],
    ['SPOTIFY_CLIENT_ID', serverConfig.spotify.clientId, 'Spotify client ID is required for authentication'],
    ['SPOTIFY_CLIENT_SECRET', serverConfig.spotify.clientSecret, 'Spotify client secret is required for authentication'],
    ['SETLISTFM_API_KEY', serverConfig.setlistFm.apiKey, 'Setlist.fm API key is required for setlist data'],
    ['CRON_SECRET', serverConfig.cron.secret, 'Cron secret is required for scheduled jobs'],
    // Redis vars are often optional depending on caching strategy
    // ['UPSTASH_REDIS_URL', serverConfig.redis.url, 'Redis URL is optional for caching'],
    // ['UPSTASH_REDIS_TOKEN', serverConfig.redis.token, 'Redis token is optional for caching'],
    // DB URL might be optional if only using Supabase client
    // ['SUPABASE_DB_URL', serverConfig.database.url, 'Direct DB URL is optional'],
  ];

  for (const [name, value, message] of requiredVars) {
    if (!value) {
      throw new Error(`Configuration Error: ${message} (${name})`);
    }
  }

  // Validate API endpoints
  const apiEndpoints = [
    { url: serverConfig.ticketmaster.baseUrl, name: 'Ticketmaster' },
    { url: serverConfig.spotify.baseUrl, name: 'Spotify' },
    { url: serverConfig.setlistFm.baseUrl, name: 'Setlist.fm' },
  ];

  for (const { url, name } of apiEndpoints) {
    if (!url || !url.startsWith('http')) {
      throw new Error(`Configuration Error: Invalid ${name} API endpoint (${url})`);
    }
  }
};

// --- Supabase Client Initialization ---
// Client-side Supabase instance (uses anon key)
export const supabase = createClient(
  clientConfig.supabase.url,
  clientConfig.supabase.anonKey
);

// --- Exports ---
// Export only client-safe config and the client instance by default
export { clientConfig, validateClientConfig };

// Export server config separately for explicit server-side use
export { serverConfig, validateServerConfig };

// Run validations (client-side validation runs on import, server-side needs explicit call)
validateClientConfig();
// Consider calling validateServerConfig() at the start of server-side processes/API routes