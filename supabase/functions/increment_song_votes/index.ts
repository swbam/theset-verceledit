
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { song_id, user_id } = await req.json();
    
    if (!song_id) {
      return new Response(
        JSON.stringify({ error: 'Missing song_id parameter' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if user has already voted for this song
    if (user_id) {
      const { data: existingVote, error: voteCheckError } = await supabase
        .from('votes')
        .select('id')
        .eq('setlist_song_id', song_id)
        .eq('user_id', user_id)
        .maybeSingle();
        
      if (voteCheckError) {
        console.error('Error checking vote:', voteCheckError);
      }
      
      if (existingVote) {
        return new Response(
          JSON.stringify({ error: 'User has already voted for this song', song_id }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
      
      // Record the vote
      const { error: insertError } = await supabase
        .from('votes')
        .insert({ setlist_song_id: song_id, user_id });
        
      if (insertError) {
        console.error('Error recording vote:', insertError);
        
        // If unique constraint violated, user already voted
        if (insertError.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'User has already voted for this song', song_id }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          );
        }
      }
    }
    
    // Update vote count
    const { data, error } = await supabase
      .from('setlist_songs')
      .update({ votes: supabase.rpc('increment_counter', { row_id: song_id }) })
      .eq('id', song_id)
      .select('id, votes, track_id')
      .single();
    
    if (error) {
      console.error('Error incrementing vote count:', error);
      
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, song: data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
