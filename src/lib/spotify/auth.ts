import { serverConfig } from '@/integrations/config';

// Cache for the client credentials token
let tokenCache = {
  accessToken: '',
  expiresAt: 0,
};

/**
 * Gets a Spotify API access token using the client credentials flow (Server-Side).
 * Caches the token to avoid repeated requests.
 */
export const getClientCredentialsToken = async (): Promise<string | null> => {
  const now = Date.now();

  // Return cached token if it's still valid (with a 60-second buffer)
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }

  // Ensure client ID and secret are configured
  if (!serverConfig.spotify.clientId || !serverConfig.spotify.clientSecret) {
    console.error('Spotify client ID or secret is not configured.');
    return null;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${serverConfig.spotify.clientId}:${serverConfig.spotify.clientSecret}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
      // Use Next.js fetch caching/revalidation if applicable, or keep simple for now
      // cache: 'no-store' // Or configure revalidation
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to get Spotify client credentials token (${response.status}):`, errorText);
      throw new Error(`Spotify token request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.access_token || !data.expires_in) {
      console.error('Invalid response from Spotify token endpoint:', data);
      throw new Error('Invalid token response from Spotify');
    }

    // Cache the new token and its expiry time
    tokenCache = {
      accessToken: data.access_token,
      // Calculate expiry time in milliseconds (expires_in is in seconds)
      expiresAt: now + data.expires_in * 1000,
    };

    return tokenCache.accessToken;

  } catch (error) {
    console.error('Error fetching Spotify client credentials token:', error);
    // Reset cache on error
    tokenCache = { accessToken: '', expiresAt: 0 };
    return null;
  }
};


// Placeholder for client-side Spotify authentication if needed.
// This function might need to be implemented differently depending on
// how client-side Spotify calls are authenticated (e.g., using user's token from Supabase session).
export const getAccessToken = async (): Promise<string> => {
  console.warn("Client-side getAccessToken called - this usually requires user context.");
  // Example: Try getting token from Supabase session if available client-side
  // import { supabase } from '@/integrations/supabase/client';
  // const { data: { session } } = await supabase.auth.getSession();
  // if (session?.provider_token) return session.provider_token;

  // Attempt to use client credentials as a fallback (might not be suitable for all client-side scenarios)
  const serverToken = await getClientCredentialsToken();
  if (serverToken) {
    console.warn("Falling back to client credentials token for client-side request.");
    return serverToken;
  }

  throw new Error("Client-side Spotify access token retrieval failed. No user context and client credentials fallback failed.");
};
