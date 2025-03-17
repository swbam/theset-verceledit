
import { useState, useEffect } from 'react';

/**
 * Hook to manage anonymous voting functionality and limits
 */
export function useAnonymousVoting(showId: string) {
  const [anonymousVoteCount, setAnonymousVoteCount] = useState(() => {
    return parseInt(localStorage.getItem(`anonymous_votes_${showId}`) || '0', 10);
  });
  
  // Track anonymous vote count in localStorage
  useEffect(() => {
    localStorage.setItem(`anonymous_votes_${showId}`, anonymousVoteCount.toString());
  }, [anonymousVoteCount, showId]);
  
  const incrementAnonymousVote = () => {
    const newCount = anonymousVoteCount + 1;
    setAnonymousVoteCount(newCount);
    return newCount;
  };
  
  const hasReachedVoteLimit = anonymousVoteCount >= 3;
  
  return {
    anonymousVoteCount,
    incrementAnonymousVote,
    hasReachedVoteLimit
  };
}
