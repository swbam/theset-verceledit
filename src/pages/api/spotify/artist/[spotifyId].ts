import type { NextApiRequest, NextApiResponse } from 'next';
import { getSpotifyAccessToken } from '@/lib/spotify/utils'; // Assuming this utility exists or needs creation

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { spotifyId } = req.query;

  if (!spotifyId || typeof spotifyId !== 'string') {
    return res.status(400).json({ error: 'Spotify ID is required' });
  }

  try {
    const accessToken = await getSpotifyAccessToken();
    if (!accessToken) {
      return res.status(500).json({ error: 'Could not retrieve Spotify access token' });
    }

    const response = await fetch(`${SPOTIFY_API_BASE}/artists/${spotifyId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Spotify API error (${response.status}): ${errorBody}`);
      // Forward Spotify's error status if possible
      return res.status(response.status).json({ error: `Spotify API error: ${response.statusText}`, details: errorBody });
    }

    const artistData = await response.json();
    return res.status(200).json(artistData);

  } catch (error) {
    console.error('Error fetching Spotify artist data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
}