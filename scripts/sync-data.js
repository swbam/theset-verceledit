import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env.local file found. Using environment variables from the system.');
  dotenv.config();
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// API Keys
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SETLISTFM_API_KEY = process.env.SETLISTFM_API_KEY || process.env.SETLIST_FM_API_KEY;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase credentials are missing. Please check your .env.local file.');
  process.exit(1);
}

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.error('Spotify API credentials are missing. Please check your .env.local file.');
  process.exit(1);
}

if (!SETLISTFM_API_KEY) {
  console.warn('Setlist.fm API key is missing. Setlist data will not be imported.');
}

// Default artists to sync if none provided
const DEFAULT_ARTISTS = [
  { name: 'Taylor Swift', spotifyId: '06HL4z0CvFAxyc27GXpf02' },
  { name: 'Billie Eilish', spotifyId: '6qqNVTkY8uBg9cP3Jd7DAH' },
  { name: 'The Weeknd', spotifyId: '1Xyo4u8uXC1ZmMpatF05PJ' },
  { name: 'Coldplay', spotifyId: '4gzpq5DPGxSnKTe4SA8HAU' },
  { name: 'Harry Styles', spotifyId: '6KImCVD70vtIoJWnq6nGn3' }
];

// Fetch Spotify access token
async function getSpotifyToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials'
    })
  });

  const data = await response.json();
  return data.access_token;
}

// Fetch artist data from Spotify
async function fetchArtistFromSpotify(spotifyId, token) {
  console.log(`Fetching Spotify data for artist ID: ${spotifyId}`);
  
  const response = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.statusText}`);
  }

  return await response.json();
}

// Fetch artist's top tracks from Spotify
async function fetchArtistTopTracks(spotifyId, token, market = 'US') {
  console.log(`Fetching top tracks for artist ID: ${spotifyId}`);
  
  const response = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=${market}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.statusText}`);
  }

  return await response.json();
}

// Fetch setlists from setlist.fm
async function fetchArtistSetlists(mbid) {
  console.log(`Fetching setlists for artist MBID: ${mbid}`);
  
  try {
    const response = await fetch(`https://api.setlist.fm/rest/1.0/artist/${mbid}/setlists`, {
      headers: {
        'x-api-key': SETLISTFM_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Setlist.fm API returned status ${response.status}: ${response.statusText}`);
      return { setlist: [] };
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching from setlist.fm:', error);
    return { setlist: [] };
  }
}

// Process and insert artist data
async function syncArtist(name, spotifyId) {
  try {
    console.log(`Starting sync for artist: ${name}`);
    
    // Get Spotify token
    const token = await getSpotifyToken();
    
    // Fetch artist data from Spotify
    const spotifyData = await fetchArtistFromSpotify(spotifyId, token);
    
    // Create or update artist in Supabase
    const { data: artist, error } = await supabase
      .from('artists')
      .upsert({
        name: spotifyData.name,
        spotify_id: spotifyId,
        image_url: spotifyData.images?.[0]?.url,
        followers: spotifyData.followers?.total,
        popularity: spotifyData.popularity,
        genres: spotifyData.genres,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'spotify_id',
        returning: 'representation'
      });

    if (error) {
      console.error('Error inserting artist:', error);
      return null;
    }

    console.log(`Synced artist: ${spotifyData.name}`);
    
    // Fetch top tracks
    const topTracks = await fetchArtistTopTracks(spotifyId, token);
    
    // Store tracks
    const tracksToInsert = topTracks.tracks.map((track) => ({
      artist_id: artist.id,
      name: track.name,
      spotify_id: track.id,
      spotify_url: track.external_urls?.spotify,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      preview_url: track.preview_url
    }));
    
    if (tracksToInsert.length > 0) {
      const { error: trackError } = await supabase
        .from('tracks')
        .upsert(tracksToInsert, {
          onConflict: 'spotify_id',
          returning: 'minimal'
        });
        
      if (trackError) {
        console.error('Error inserting tracks:', trackError);
      } else {
        console.log(`Inserted ${tracksToInsert.length} tracks for ${artist.name}`);
      }
    }

    // Try to get setlist.fm MBID if available
    if (artist.setlist_fm_mbid) {
      await syncSetlists(artist.id, artist.name, artist.setlist_fm_mbid);
    }
    
    return artist;
  } catch (error) {
    console.error(`Error syncing artist ${name}:`, error);
    return null;
  }
}

// Process and insert setlist data
async function syncSetlists(artistId, artistName, mbid) {
  try {
    console.log(`Syncing setlists for: ${artistName}`);
    
    const setlistData = await fetchArtistSetlists(mbid);
    
    if (!setlistData.setlist || setlistData.setlist.length === 0) {
      console.warn(`No setlists found for artist: ${artistName}`);
      return;
    }
    
    console.log(`Found ${setlistData.setlist.length} setlists for ${artistName}`);
    
    // Process each setlist
    for (const setlist of setlistData.setlist.slice(0, 25)) { // Limit to 25 to avoid hitting rate limits
      const setlistDate = setlist.eventDate ? new Date(setlist.eventDate) : new Date(setlist.lastUpdated);
      
      const { data: setlistRecord, error } = await supabase
        .from('setlists')
        .upsert({
          artist_id: artistId,
          date: setlistDate.toISOString(),
          venue: setlist.venue?.name,
          venue_city: `${setlist.venue?.city?.name}, ${setlist.venue?.city?.country?.code}`,
          tour_name: setlist.tour?.name || null,
          setlist_fm_id: setlist.id
        }, {
          onConflict: 'setlist_fm_id',
          returning: 'representation'
        });
        
      if (error) {
        console.error('Error inserting setlist:', error);
        continue;
      }
      
      // Store raw setlist data
      await supabase
        .from('setlist_raw_data')
        .upsert({
          artist_id: artistId,
          setlist_id: setlistRecord.id,
          raw_data: setlist
        }, {
          onConflict: 'setlist_id',
          returning: 'minimal'
        });
      
      // Process songs in the setlist
      if (setlist.sets?.set) {
        let position = 0;
        for (const set of setlist.sets.set) {
          if (set.song) {
            for (const song of set.song) {
              position++;
              const { error: songError } = await supabase
                .from('setlist_songs')
                .upsert({
                  setlist_id: setlistRecord.id,
                  name: song.name,
                  position: position,
                  artist_id: artistId,
                  vote_count: 0
                }, {
                  onConflict: 'setlist_id,position',
                  returning: 'minimal'
                });
                
              if (songError) {
                console.error('Error inserting song:', songError);
              }
            }
          }
        }
      }
      
      console.log(`Synced setlist from ${setlistDate.toLocaleDateString()} at ${setlist.venue?.name}`);
      
      // Sleep to avoid rate limiting
      await setTimeout(500);
    }
    
    console.log(`Completed syncing setlists for ${artistName}`);
  } catch (error) {
    console.error(`Error syncing setlists for ${artistName}:`, error);
  }
}

// Create some upcoming shows for testing
async function createUpcomingShows(artist) {
  const futureDates = [
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),   // 1 week from now
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),  // 2 weeks from now
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),  // 1 month from now
  ];
  
  const venues = [
    { name: 'Madison Square Garden', city: 'New York, US' },
    { name: 'The O2', city: 'London, UK' },
    { name: 'Forum', city: 'Los Angeles, US' },
    { name: 'Scotiabank Arena', city: 'Toronto, CA' }
  ];
  
  for (let i = 0; i < 3; i++) {
    const randomVenue = venues[Math.floor(Math.random() * venues.length)];
    
    const { error } = await supabase
      .from('shows')
      .upsert({
        artist_id: artist.id,
        date: futureDates[i].toISOString(),
        venue: randomVenue.name,
        city: randomVenue.city,
        ticket_url: 'https://www.ticketmaster.com',
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'artist_id,date,venue',
        returning: 'minimal'
      });
    
    if (error) {
      console.error('Error creating show:', error);
    } else {
      console.log(`Created upcoming show for ${artist.name} at ${randomVenue.name}`);
    }
  }
}

// Main function
async function main() {
  console.log('Starting data sync process...');
  
  // Sync default artists if none provided
  for (const artistInfo of DEFAULT_ARTISTS) {
    const artist = await syncArtist(artistInfo.name, artistInfo.spotifyId);
    
    if (artist) {
      // Create some upcoming shows for the artist
      await createUpcomingShows(artist);
      
      // Add a delay between artists to avoid rate limits
      await setTimeout(1000);
    }
  }
  
  console.log('Data sync completed!');
}

// Run the script
main().catch(console.error);