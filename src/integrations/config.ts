import { createClient } from '@supabase/supabase-js';

// Environment configuration
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  ticketmaster: {
    apiKey: process.env.TICKETMASTER_API_KEY || '',
    baseUrl: 'https://app.ticketmaster.com/discovery/v2'
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    baseUrl: 'https://api.spotify.com/v1'
  },
  setlistFm: {
    apiKey: process.env.SETLIST_FM_API_KEY || '',
    baseUrl: 'https://api.setlist.fm/rest/1.0'
  }
};

// Validate required environment variables
const validateConfig = () => {
  const requiredVars = [
    ['Supabase URL', config.supabase.url],
    ['Supabase Anon Key', config.supabase.anonKey],
    ['Ticketmaster API Key', config.ticketmaster.apiKey],
    ['Spotify Client ID', config.spotify.clientId],
    ['Spotify Client Secret', config.spotify.clientSecret],
    ['Setlist.fm API Key', config.setlistFm.apiKey]
  ];

  for (const [name, value] of requiredVars) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }
};

// Initialize Supabase client
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Export configuration
export { config, validateConfig };