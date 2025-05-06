/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore: Cannot find module 'next/server' type declarations
import { NextResponse } from 'next/server';
// @ts-ignore: Cannot find module 'next/headers' type declarations
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define types for better code safety
type VoteAction = 'increment' | 'decrement';

interface VoteRequest {
  songId: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { songId } = body as VoteRequest;

    // Validation
    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Get the setlist song record
    const { data: setlistSong, error: songError } = await supabase
      .from('setlist_songs')
      .select('id, votes')
      .eq('song_id', songId)
      .single();

    if (songError || !setlistSong) {
      return NextResponse.json({ error: 'Song not found in setlist' }, { status: 404 });
    }

    // If user is authenticated, check for existing vote
    if (userId) {
      const { data: existingVote } = await supabase
        .from('user_votes')
        .select('id')
        .eq('user_id', userId)
        .eq('song_id', songId)
        .single();

      if (existingVote) {
        return NextResponse.json({ error: 'Already voted for this song' }, { status: 400 });
      }

      // Record the vote
      const { error: voteError } = await supabase
        .from('user_votes')
        .insert({ user_id: userId, song_id: songId });

      if (voteError) {
        console.error('Failed to record vote:', voteError);
        return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
      }
    }

    // Increment the vote count
    const { error: updateError } = await supabase
      .from('setlist_songs')
      .update({ votes: (setlistSong.votes || 0) + 1 })
      .eq('id', setlistSong.id);

    if (updateError) {
      console.error('Failed to update vote count:', updateError);
      return NextResponse.json({ error: 'Failed to update vote count' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Vote recorded' });

  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}