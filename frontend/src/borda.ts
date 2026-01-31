import type { Movie, Vote, BordaResult } from './types';
import { breakTie } from './tiebreaker';

/**
 * Borda Count: Each candidate receives points based on ranking position.
 * With N candidates ranked, 1st place gets N-1 points, 2nd gets N-2, ..., last gets 0.
 * Only ranked candidates receive points from each ballot.
 */
export function calculateBorda(movies: Movie[], votes: Vote[]): BordaResult {
  if (movies.length === 0 || votes.length === 0) {
    return { winner: null, scores: {}, totalVotes: 0, maxPossibleScore: 0 };
  }

  const candidateIds = new Set(movies.map((m) => m.movieId));
  const scores: Record<string, number> = {};

  // Initialize scores
  candidateIds.forEach((id) => {
    scores[id] = 0;
  });

  // Calculate Borda scores
  votes.forEach((vote) => {
    // Filter to only valid candidates
    const validRankings = vote.rankings.filter((id) => candidateIds.has(id));
    const rankedCount = validRankings.length;

    validRankings.forEach((candidateId, index) => {
      // Points decrease as position increases: (rankedCount - 1) for 1st, (rankedCount - 2) for 2nd, etc.
      scores[candidateId] += rankedCount - 1 - index;
    });
  });

  // Find winner (highest score)
  const sortedEntries = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  // Check for ties at the top
  const topScore = sortedEntries[0]?.[1] ?? 0;
  const tiedWinners = sortedEntries
    .filter(([, score]) => score === topScore)
    .map(([id]) => id);

  // Max possible score: if everyone ranked all candidates, 1st place gets (n-1) * votes
  const maxPossibleScore = (movies.length - 1) * votes.length;

  // Determine winner, using head-to-head tie-breaker if needed
  let winner: string | null = null;
  let tieBreaker: 'head-to-head' | 'coin-flip' | undefined;

  if (tiedWinners.length === 0) {
    winner = null;
  } else if (tiedWinners.length === 1) {
    winner = tiedWinners[0];
  } else {
    // Multiple candidates tied for first - use head-to-head tie-breaker
    const result = breakTie(tiedWinners, votes, false);
    winner = result.winnerId;
    tieBreaker = result.method;
  }

  return {
    winner,
    scores,
    totalVotes: votes.length,
    maxPossibleScore,
    tieBreaker,
  };
}
