// This file has been modified to support both local development and production environments
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Detect if we're in a local development environment
const isLocalDevelopment = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Determine the redirect URL based on environment
const getRedirectUrl = () => {
  if (isLocalDevelopment) {
    // Use the current port (8080 or 8081) for local development
    return `${window.location.protocol}//${window.location.host}/auth/callback`;
  }
  
  // In production, use the deployed URL
  return 'https://theset-verceledit.vercel.app/auth/callback';
};

// Log the current environment and redirect URL
if (typeof window !== 'undefined') {
  console.log(`Environment: ${isLocalDevelopment ? 'Local Development' : 'Production'}`);
  console.log(`Auth redirect URL: ${getRedirectUrl()}`);
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // More secure authentication flow for mobile and SPA
    storage: {
      getItem: (key) => {
        try {
          const storedValue = localStorage.getItem(key);
          if (!storedValue) return null;
          return JSON.parse(storedValue);
        } catch (error) {
          console.error('Error retrieving auth from storage:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.error('Error storing auth in storage:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing auth from storage:', error);
        }
      }
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-application-name': isLocalDevelopment ? 'theset-local' : 'theset-client'
    },
    fetch: fetch // Explicitly provide the fetch implementation
  }
});

/**
 * Sign in with a specific provider and use the appropriate redirect URL
 * @param provider The auth provider to use (e.g., 'spotify')
 */
export const signInWithProvider = async (provider: 'spotify' | 'google') => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl()
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error signing in with ${provider}:`, error);
    throw error;
  }
};

// Connection status tracking
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000; // 3 seconds

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    console.log('Auth session initialized');
  } else {
    console.log('No active auth session');
  }
}).catch(error => {
  console.error('Error initializing auth:', error);
});

/**
 * Create a realtime channel subscription for a specific table
 * @param table The table to subscribe to
 * @param callback The callback to execute when data changes
 * @returns A function to unsubscribe
 */
export function subscribeToTable(
  table: string, 
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  try {
    console.log(`Subscribing to table: ${table}`);
    
    const channel = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: table
      }, payload => {
        console.log(`Realtime change received for ${table}:`, payload);
        callback(payload);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${table} changes`);
          isConnected = true;
          reconnectAttempts = 0; // Reset counter on successful connection
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error(`Error connecting to ${table} channel:`, status);
          isConnected = false;
          handleReconnect(table, callback);
        } else if (status === 'TIMED_OUT') {
          console.error('Connection timed out');
          isConnected = false;
          handleReconnect(table, callback);
        } else {
          console.log(`Realtime channel status for ${table}:`, status);
        }
      });
    
    return () => {
      console.log(`Unsubscribing from table: ${table}`);
      channel.unsubscribe();
    };
  } catch (error) {
    console.error(`Failed to set up realtime subscription for ${table}:`, error);
    isConnected = false;
    handleReconnect(table, callback);
    return () => {}; // Return empty function as fallback
  }
}

/**
 * Create a realtime channel subscription for a specific record
 * @param table The table containing the record
 * @param column The column to filter on (usually 'id')
 * @param value The value to filter for
 * @param callback The callback to execute when data changes
 * @returns A function to unsubscribe
 */
export function subscribeToRecord(
  table: string, 
  column: string, 
  value: string, 
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  try {
    console.log(`Subscribing to record: ${table} where ${column}=${value}`);
    
    const channel = supabase
      .channel(`public:${table}:${column}:${value}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: table,
        filter: `${column}=eq.${value}`
      }, payload => {
        console.log(`Realtime change received for ${table} record:`, payload);
        callback(payload);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${table} record changes`);
          isConnected = true;
          reconnectAttempts = 0;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error(`Error connecting to ${table} record channel:`, status);
          isConnected = false;
          handleRecordReconnect(table, column, value, callback);
        } else if (status === 'TIMED_OUT') {
          console.error('Connection timed out');
          isConnected = false;
          handleRecordReconnect(table, column, value, callback);
        } else {
          console.log(`Realtime channel status for ${table} record:`, status);
        }
      });
    
    return () => {
      console.log(`Unsubscribing from record: ${table} where ${column}=${value}`);
      channel.unsubscribe();
    };
  } catch (error) {
    console.error(`Failed to set up realtime subscription for ${table} record:`, error);
    isConnected = false;
    handleRecordReconnect(table, column, value, callback);
    return () => {}; // Return empty function as fallback
  }
}

/**
 * Handle reconnection logic with exponential backoff for table subscriptions
 */
function handleReconnect(
  table: string, 
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    const delay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttempts);
    console.log(`Attempting to reconnect to ${table} in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setTimeout(() => {
      subscribeToTable(table, callback);
    }, delay);
  } else {
    console.error(`Failed to reconnect to ${table} after ${MAX_RECONNECT_ATTEMPTS} attempts`);
  }
}

/**
 * Handle reconnection logic with exponential backoff for record subscriptions
 */
function handleRecordReconnect(
  table: string, 
  column: string, 
  value: string, 
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    const delay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttempts);
    console.log(`Attempting to reconnect to ${table} record in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setTimeout(() => {
      subscribeToRecord(table, column, value, callback);
    }, delay);
  } else {
    console.error(`Failed to reconnect to ${table} record after ${MAX_RECONNECT_ATTEMPTS} attempts`);
  }
}

// Initialize realtime only after auth check
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  if (session) {
    console.log('User authenticated, realtime subscriptions will be enabled');
  } else {
    console.log('User not authenticated');
  }
});
