import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../_shared/types.ts'

interface VoteSongPayload {
  songId: string;
  userId?: string;
  action: 'upvote' | 'downvote';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { songId, userId, action } = await req.json() as VoteSongPayload

    if (!songId) {
      throw new Error('songId is required')
    }

    if (!action || !['upvote', 'downvote'].includes(action)) {
      throw new Error('Invalid action. Must be "upvote" or "downvote"')
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
    if (userId) {
      const { error: voteError } = await supabase
        .from('user_votes')
        .upsert({
          user_id: userId,
          song_id: songId,
          vote_type: action,
          created_at: new Date().toISOString()
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
