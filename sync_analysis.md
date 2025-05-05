# API Sync System Analysis & Fixes

## Current Issues
1. **Ticketmaster Sync**:
   - Missing venue and show relationships
   - Incomplete field mappings (ticketmaster_id not consistently used)
   - No proper error handling for rate limits

2. **Spotify Sync**:
   - Track data not properly linked to artists
   - Missing popularity/follower updates
   - No retry mechanism for failed syncs

3. **Setlist.fm Sync**:
   - MBID lookup not implemented
   - Setlist songs not properly linked to shows
   - Raw setlist data not stored consistently

## Proposed Fixes

### Ticketmaster Improvements
```javascript
// In ticketmaster-config.ts
const handleRateLimit = (response) => {
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After')) || 5;
    console.log(`Rate limited, retrying after ${retryAfter} seconds`);
    await setTimeout(retryAfter * 1000);
    return true;
  }
  return false;
};
```

### Spotify Enhancements
```javascript
// In sync-data.js
async function syncSpotifyTracks(artistId, spotifyId) {
  const token = await getSpotifyToken();
  const tracks = await fetchArtistTopTracks(spotifyId, token);
  
  // Store tracks with proper artist relationship
  await supabase.from('tracks').upsert(
    tracks.map(track => ({
      artist_id: artistId,
      spotify_id: track.id,
      // ... other fields
    })),
    { onConflict: 'spotify_id' }
  );
}
```

### Setlist.fm Fixes
```javascript
// In sync-data.js
async function getArtistMBID(artistName) {
  const response = await fetch(
    `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(artistName)}`,
    { headers: { 'x-api-key': SETLISTFM_API_KEY } }
  );
  // Process response to get MBID
}
```

## Implementation Plan
1. Update ticketmaster-config.ts with rate limiting
2. Enhance sync-data.js with proper track relationships
3. Implement MBID lookup for Setlist.fm
4. Add retry logic for all API calls
5. Document new sync patterns in README.md