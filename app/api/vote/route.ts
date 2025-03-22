import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Define types for better code safety
type VoteAction = 'increment' | 'decrement';

interface VoteRequest {
  songId: string;
  action: VoteAction;
}

export async function POST(request: NextRequest) {
  try {
    const { songId, action } = await request.json() as VoteRequest;

    // Validation
    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }
    
    if (!action || (action !== 'increment' && action !== 'decrement')) {
      return NextResponse.json({ error: 'Valid action (increment/decrement) is required' }, { status: 400 });
    }

    // Initialize Supabase client with cookies and better configuration
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    }, {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options: {
        global: {
          headers: {
            'x-application-name': 'theset-client'
          }
        }
      }
    });
    
    // Get user from session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session verification error:', sessionError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Check if song exists
    const { data: song, error: songError } = await supabase
      .from('setlist_songs')
      .select('id')
      .eq('id', songId)
      .single();
      
    if (songError || !song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }
    
    // Check for existing vote
    const { data: existingVote, error: voteError } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', userId)
      .eq('song_id', songId)
      .single();
    
    // Handle different vote scenarios
    if (action === 'increment') {
      if (!existingVote) {
        // Create new vote
        const { error: insertError } = await supabase
          .from('votes')
          .insert({ user_id: userId, song_id: songId });
          
        if (insertError) {
          console.error('Failed to add vote:', insertError);
          return NextResponse.json({ error: 'Failed to add vote' }, { status: 500 });
        }
        
        // Call stored procedure to increment song's vote count
        const { error: incError } = await supabase.rpc('increment_vote', { song_id: songId });
        
        if (incError) {
          console.error('Failed to increment vote count:', incError);
          return NextResponse.json({ error: 'Failed to update vote count' }, { status: 500 });
        }
      }
      
      // If vote already exists, it's a no-op (idempotent)
      return NextResponse.json({ success: true, message: 'Vote recorded' });
      
    } else if (action === 'decrement') {
      if (existingVote) {
        // Delete existing vote
        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('user_id', userId)
          .eq('song_id', songId);
          
        if (deleteError) {
          console.error('Failed to remove vote:', deleteError);
          return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 });
        }
        
        // Call stored procedure to decrement song's vote count
        const { error: decError } = await supabase.rpc('decrement_vote', { song_id: songId });
        
        if (decError) {
          console.error('Failed to decrement vote count:', decError);
          return NextResponse.json({ error: 'Failed to update vote count' }, { status: 500 });
        }
      }
      
      // If no vote exists, it's a no-op (idempotent)
      return NextResponse.json({ success: true, message: 'Vote removed' });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 