'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function handleVote(songId: string, userId: string, increment: boolean) {
  try {
    // Atomic update with error handling
    const { error: voteError } = await supabase.rpc(increment ? 'increment_vote' : 'decrement_vote', {
      song_id: songId,
      user_id: userId
    });

    if (voteError) throw voteError;

    // Cache invalidation
    revalidatePath(`/songs/${songId}`);
    return { success: true };
  } catch (error) {
    console.error('Voting error:', error);
    return { error: 'Failed to process vote' };
  }
} 