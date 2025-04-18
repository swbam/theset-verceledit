import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../_shared/types.ts'

interface VoteSongPayload {
  songId: string;
  userId?: string;
  action: 'upvote' | 'downvote';
  authToken?: string; // Add auth token support
}

serve(async (req: Request) => {
  // Always handle CORS OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json() as VoteSongPayload
    const { songId, userId, action, authToken } = payload

    console.log(`Processing vote request: ${action} for song ${songId}`)

    if (!songId) {
      throw new Error('songId is required')
    }

    if (!action || !['upvote', 'downvote'].includes(action)) {
      throw new Error('Invalid action. Must be "upvote" or "downvote"')
    }

    // Authenticate user if token is provided but no userId
    let authenticatedUserId = userId
    if (authToken && !authenticatedUserId) {
      try {
        // Create a new supabase client with the user's auth token
        const userClient = createClient<Database>(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: `Bearer ${authToken}` } } }
        )

        // Get the user's ID from the auth token
        const { data: { user }, error: userError } = await userClient.auth.getUser()
        
        if (userError || !user) {
          console.error('Auth error:', userError)
          throw new Error('Authentication failed')
        }
        
        authenticatedUserId = user.id
        console.log(`Authenticated user: ${authenticatedUserId}`)
      } catch (authError) {
        console.error('Auth error:', authError)
        return new Response(
          JSON.stringify({
            message: 'Authentication failed',
            error: authError instanceof Error ? authError.message : 'Unknown auth error'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401
          }
        )
      }
    }

    // Start a transaction
    const { data: song, error: selectError } = await supabase
      .from('setlist_songs')
      .select('votes')
      .eq('id', songId)
      .single()

    if (selectError) {
      throw selectError
    }

    if (!song) {
      throw new Error('Song not found')
    }

    // Update the vote count
    const voteChange = action === 'upvote' ? 1 : -1
    const { data: updatedSong, error: updateError } = await supabase
      .from('setlist_songs')
      .update({ 
        votes: (song.votes || 0) + voteChange,
        updated_at: new Date().toISOString()
      })
      .eq('id', songId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // If we have a userId, track their vote
    if (authenticatedUserId) {
      const { error: voteError } = await supabase
        .from('user_votes')
        .upsert({
          user_id: authenticatedUserId,
          song_id: songId,
          vote_type: action,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,song_id'
        })

      if (voteError) {
        console.error('Error tracking user vote:', voteError)
      }
    }

    return new Response(
      JSON.stringify({
        message: `Vote ${action} successful`,
        data: updatedSong
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        message: 'Error processing vote',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
