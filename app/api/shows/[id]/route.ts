/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/db';
import { getArtistTopTracks } from '../../../../src/lib/spotify/top-tracks';
import { fetchShowDetails } from '../../../../src/lib/ticketmaster';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1) Fetch the show by its internal ID from Supabase
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select(`
        id,
        ticketmaster_id,
        artist_id,
        updated_at,
        venue:venue_id (
          id,
          name,
          city,
          state,
          country
        ),
        setlists: setlists (
          id,
          created_at,
          setlist_songs: setlist_songs (
            id,
            title,
            spotify_id,
            created_at
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (showError) {
      return NextResponse.json(
        { error: showError.message },
        { status: 500 }
      );
    }
    if (!show) {
      return NextResponse.json(
        { error: "Show not found" },
        { status: 404 }
      );
    }

    // 2) If the show does not have a setlist, create one using Spotify data
    if (!show.setlists || show.setlists.length === 0) {
      console.log('No setlist found for this show, creating one...');
      // Fetch artist details to get Spotify ID
      const { data: artist, error: artistError } = await supabase
        .from('artists')
        .select('id, spotify_id')
        .eq('id', show.artist_id)
        .single();

      if (artistError || !artist) {
        return NextResponse.json(
          { error: "Artist not found" },
          { status: 404 }
        );
      }

      // Define a proper type for Spotify tracks
      // Use a more generic type to accommodate different Spotify track formats
      interface SpotifyTrack {
        id: string;
        name: string;
        duration_ms?: number;
        popularity?: number;
        preview_url?: string | null;
        album?: Record<string, unknown>; // Use Record to accommodate different formats
      }
      
      let spotifyTracks: Array<SpotifyTrack> = [];
      if (artist.spotify_id) {
        try {
          const tracksData = await getArtistTopTracks(artist.spotify_id as string);
          // Convert response to expected format if needed
          if (tracksData && Array.isArray(tracksData.tracks)) {
            // Convert to our SpotifyTrack format with proper type handling
            spotifyTracks = tracksData.tracks.map((track: unknown) => ({
              id: String(track && typeof track === 'object' && 'id' in track ? track.id : ''),
              name: String(track && typeof track === 'object' && 'name' in track ? track.name : ''),
              duration_ms: track && typeof track === 'object' && 'duration_ms' in track ? Number(track.duration_ms) : undefined,
              popularity: track && typeof track === 'object' && 'popularity' in track ? Number(track.popularity) : undefined,
              preview_url: track && typeof track === 'object' && 'preview_url' in track ? String(track.preview_url) : null
            }));
          } else if (Array.isArray(tracksData)) {
            // Convert to our SpotifyTrack format with proper type handling
            spotifyTracks = tracksData.map((track: unknown) => ({
              id: String(track && typeof track === 'object' && 'id' in track ? track.id : ''),
              name: String(track && typeof track === 'object' && 'name' in track ? track.name : ''),
              duration_ms: track && typeof track === 'object' && 'duration_ms' in track ? Number(track.duration_ms) : undefined,
              popularity: track && typeof track === 'object' && 'popularity' in track ? Number(track.popularity) : undefined,
              preview_url: track && typeof track === 'object' && 'preview_url' in track ? String(track.preview_url) : null
            }));
          }
        } catch (trackError) {
          console.error("Error fetching Spotify tracks:", trackError);
        }
      }

      // Create a new setlist for the show
      const { data: newSetlist, error: setlistError } = await supabase
        .from('setlists')
        .insert({ 
          show_id: show.id,
          artist_id: artist.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (setlistError || !newSetlist) {
        return NextResponse.json(
          { error: "Error creating setlist" },
          { status: 500 }
        );
      }

        // Insert setlist songs based on Spotify tracks
      if (spotifyTracks.length > 0) {
        // First insert tracks into songs table
        const setlistSongs = [];
        let hasError = false;
        
        for (const track of spotifyTracks.slice(0, 10)) { // Limit to 10 tracks
          try {
            const { data: song, error: songError } = await supabase
              .from('songs')
              .upsert({
                name: track.name,
                artist_id: artist.id,
                spotify_id: track.id,
                duration_ms: track.duration_ms || 0,
                popularity: track.popularity || 0,
                preview_url: track.preview_url || null
              }, { onConflict: 'spotify_id' })
              .select('id')
              .single();

            if (songError) {
              console.error('Error inserting song:', songError);
              continue;
            }

            if (song) {
              // Add to setlist_songs array for batch insert
              setlistSongs.push({
                setlist_id: newSetlist.id,
                song_id: song.id,
                name: track.name,
                artist_id: artist.id,
                position: spotifyTracks.indexOf(track),
                vote_count: 0
              });
            }
          } catch (error) {
            console.error(`Error processing track ${track.name}:`, error);
            hasError = true;
          }
        }
        
        // Batch insert all setlist songs
        if (setlistSongs.length > 0) {
          const { error: batchError } = await supabase
            .from('setlist_songs')
            .insert(setlistSongs);
            
          if (batchError) {
            console.error('Error batch inserting setlist songs:', batchError);
            hasError = true;
          }
        }
        
        if (hasError) {
          console.warn('There were some errors during setlist song creation, but continuing...');
        }
      }

      // Refresh the show data with the newly created setlist
      const { data: updatedShow, error: refreshError } = await supabase
        .from('shows')
        .select(`
          id,
          updated_at,
          venue:venue_id (
            id,
            name,
            city,
            state,
            country
          ),
          setlists: setlists (
            id,
            created_at,
            setlist_songs: setlist_songs (
              id,
              title,
              spotify_id,
              created_at
            )
          )
        `)
        .eq('id', show.id)
        .single();

      if (refreshError) {
        return NextResponse.json(
          { error: refreshError.message },
          { status: 500 }
        );
      }
      return NextResponse.json(updatedShow);
    }

    // 3) If the show data is stale (>24 hours), refresh from Ticketmaster
    const lastUpdated = new Date(show.updated_at as string).getTime();
    const now = Date.now();
    const oneDayMs = 86400000; // 24 hours in milliseconds

    if (now - lastUpdated > oneDayMs) {
      if (!show.ticketmaster_id) {
        return NextResponse.json(show, { status: 200 });
      }

      const tmShow = show.ticketmaster_id ? await fetchShowDetails(show.ticketmaster_id as string) : null;
      if (!tmShow) {
        return NextResponse.json(show, { status: 200 });
      }

      const localDate = tmShow?.dates?.start?.localDate
        ? new Date(tmShow.dates.start.localDate).toISOString()
        : new Date().toISOString();
      const ticketUrl = tmShow?.url || '';

      // Upsert venue data from Ticketmaster
      const venue = tmShow?._embedded?.venues?.[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let venueId = show.venue ? (show.venue as any).id : null;
      if (venue) {
        const { data: upsertedVenues, error: venueError } = await supabase
          .from('venues')
          .upsert({
            id: venueId ? venueId : undefined,
            tm_id: venue.id,
            name: venue.name,
            city: venue.city?.name,
            state: venue.state?.stateCode,
            country: venue.country?.countryCode,
            updated_at: new Date().toISOString()
          })
          .select('id');

        if (!venueError && upsertedVenues && upsertedVenues.length > 0) {
          venueId = upsertedVenues[0].id;
        }
      }

      const { error: updateError } = await supabase
        .from('shows')
        .update({
          date: localDate,
          ticket_url: ticketUrl,
          venue_id: venueId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', show.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      const { data: refreshedShow, error: refError } = await supabase
        .from('shows')
        .select(`
          id,
          date,
          ticket_url,
          updated_at,
          venue:venue_id (
            id,
            name,
            city,
            state,
            country
          ),
          setlists: setlists (
            id,
            created_at,
            setlist_songs: setlist_songs (
              id,
              title,
              spotify_id,
              created_at
            )
          )
        `)
        .eq('id', show.id)
        .single();

      if (refError) {
        return NextResponse.json(
          { error: refError.message },
          { status: 500 }
        );
      }
      return NextResponse.json(refreshedShow);
    }

    // 4) Otherwise, return the existing show data
    return NextResponse.json(show);
  } catch (err: unknown) {
    let errorMessage = "Unknown error";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    console.error("Error in GET /api/shows/[id]:", err);
    return NextResponse.json(
      { error: "Server error", details: errorMessage },
      { status: 500 }
    );
  }
}
