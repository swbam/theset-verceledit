import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Environment Variables (Client-Side Safe)
// Support both Vite and Next.js formats for backward compatibility
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 
                   (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_URL);
                   
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                        (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables:', { SUPABASE_URL, SUPABASE_ANON_KEY });
  throw new Error('Supabase environment variables are required');
}

// Detect environment
const isLocalDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Get the current origin for auth redirects
const getOrigin = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
};

// Create Supabase client
const initClient = () => {
  console.log('Initializing Supabase client with:', { SUPABASE_URL, SUPABASE_ANON_KEY });
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      autoRefreshToken: true,
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    global: {
      headers: {
        'x-application-name': isLocalDevelopment ? 'theset-local' : 'theset-prod'
      }
    }
  });
};

// Export singleton instance
export const supabase = initClient();

// Auth helper functions
export const signInWithProvider = async (provider: 'spotify' | 'google') => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${getOrigin()}/auth/callback`,
        scopes: provider === 'spotify' ? 'user-read-email user-read-private user-top-read user-follow-read playlist-read-private' : undefined
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error signing in with ${provider}:`, error);
    throw error;
  }
};

// Realtime subscription helpers
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000;

export function subscribeToTable(
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  const channel = supabase
    .channel(`public:${table}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table
    }, callback)
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        isConnected = true;
        reconnectAttempts = 0;
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        isConnected = false;
        handleReconnect(table, callback);
      }
    });

  return () => channel.unsubscribe();
}

export function subscribeToRecord(
  table: string,
  column: string,
  value: string,
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  const channel = supabase
    .channel(`public:${table}:${column}:${value}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table,
      filter: `${column}=eq.${value}`
    }, callback)
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        isConnected = true;
        reconnectAttempts = 0;
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        isConnected = false;
        handleRecordReconnect(table, column, value, callback);
      }
    });

  return () => channel.unsubscribe();
}

function handleReconnect(
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    const delay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttempts);
    setTimeout(() => {
      subscribeToTable(table, callback);
      reconnectAttempts++;
    }, delay);
  }
}

function handleRecordReconnect(
  table: string,
  column: string,
  value: string,
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    const delay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttempts);
    setTimeout(() => {
      subscribeToRecord(table, column, value, callback);
      reconnectAttempts++;
    }, delay);
  }
}

// Initialize auth listener
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    console.log('User authenticated, realtime subscriptions enabled');
  }
});
