
// Supabase Edge Function to safely increment a setlist song's votes
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get songId from request
    const { songId } = await req.json()
    
    if (!songId) {
      return new Response(
        JSON.stringify({ error: 'Missing song ID' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Update the votes count using SQL to ensure atomic increment
    const { data, error } = await supabase.rpc('increment_song_vote', { song_id: songId })
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    return new Response(
      JSON.stringify({ success: true, songId }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
