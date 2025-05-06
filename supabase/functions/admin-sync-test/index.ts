import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Admin Sync Test Edge Function initializing')

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { artistName } = await req.json()

    if (!artistName) {
      return new Response(JSON.stringify({ error: 'Artist name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Admin Sync Test: Received request for artist: ${artistName}`)

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Call unified-sync-v2 Edge Function
    console.log(`Admin Sync Test: Invoking unified-sync-v2 for ${artistName}`)
    const { data: syncData, error: syncError } = await supabaseAdmin.functions.invoke(
      'unified-sync-v2',
      {
        body: {
          entityType: 'artist',
          artistName,
          mode: 'full',
          options: {
            forceRefresh: true,
            skipDependencies: false,
          },
        },
      },
    )

    if (syncError) {
      console.error('Admin Sync Test: unified-sync-v2 error:', syncError)
      return new Response(
        JSON.stringify({
          error: syncError.message,
          logs: syncData?.logs || [],
          success: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
    console.log(`Admin Sync Test: unified-sync-v2 completed for ${artistName}. Logs:`, syncData?.logs)

    // Get artist details from database
    console.log(`Admin Sync Test: Fetching artist details for ${artistName} from DB`)
    const { data: artist, error: artistError } = await supabaseAdmin
      .from('artists')
      .select('id, name, spotify_id, ticketmaster_id, sync_status, last_sync, last_sync_error')
      .eq('name', artistName)
      .single()

    if (artistError || !artist) {
      console.error('Admin Sync Test: Error fetching artist from DB or artist not found:', artistError)
      return new Response(
        JSON.stringify({
          error: 'Artist not found after sync or DB error: ' + (artistError?.message || 'Not found'),
          logs: syncData?.logs || [],
          success: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
    console.log(`Admin Sync Test: Artist details fetched:`, artist)

    // Get all related data counts
    console.log(`Admin Sync Test: Fetching counts for artist ID: ${artist.id}`)
    const [songsResult, showsResult, setlistsResult] = await Promise.all([
      supabaseAdmin
        .from('songs')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artist.id),
      supabaseAdmin
        .from('shows')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artist.id),
      supabaseAdmin
        .from('setlists') // Assuming 'setlists' table exists and has 'artist_id'
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artist.id),
    ])

    console.log(`Admin Sync Test: Counts fetched - Songs: ${songsResult.count}, Shows: ${showsResult.count}, Setlists: ${setlistsResult.count}`)

    return new Response(
      JSON.stringify({
        artist: {
          id: artist.id,
          name: artist.name,
          spotify_id: artist.spotify_id,
          ticketmaster_id: artist.ticketmaster_id,
          sync_status: artist.sync_status,
          last_sync: artist.last_sync,
          last_sync_error: artist.last_sync_error,
        },
        counts: {
          songs: songsResult.count || 0,
          shows: showsResult.count || 0,
          setlists: setlistsResult.count || 0,
        },
        logs: syncData?.logs || [],
        success: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Admin Sync Test: Unhandled error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        logs: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}) 