import type { Movie, Vote, CondorcetResult, CondorcetRanking } from './types';
import { breakTie } from './tiebreaker';

/**
 * Condorcet Method: Finds the candidate who would beat every other candidate
 * in a head-to-head matchup. If no such candidate exists, uses Copeland scoring
 * (wins minus losses) as a fallback, with head-to-head tie-breaking.
 */
export function calculateCondorcet(
  movies: Movie[],
  votes: Vote[]
): CondorcetResult {
  if (movies.length === 0 || votes.length === 0) {
    return {
      winner: null,
      rankings: [],
      totalVotes: 0,
      noCondorcetWinner: true,
    };
  }

  const candidateIds = movies.map((m) => m.movieId);
  const n = candidateIds.length;

  // Build pairwise comparison: winsAgainst[a][b] = number of voters who prefer a over b
  const winsAgainst: Record<string, Record<string, number>> = {};

  // Initialize
  candidateIds.forEach((a) => {
    winsAgainst[a] = {};
    candidateIds.forEach((b) => {
      if (a !== b) winsAgainst[a][b] = 0;
    });
  });

  // Count pairwise preferences
  const candidateSet = new Set(candidateIds);

  votes.forEach((vote) => {
    const rankedIds = vote.rankings.filter((id) => candidateSet.has(id));

    // For each pair in the ranking, the earlier one is preferred
    for (let i = 0; i < rankedIds.length; i++) {
      for (let j = i + 1; j < rankedIds.length; j++) {
        // Voter prefers rankedIds[i] over rankedIds[j]
        winsAgainst[rankedIds[i]][rankedIds[j]]++;
      }
    }

    // Ranked candidates are also preferred over unranked candidates
    const unranked = candidateIds.filter((id) => !rankedIds.includes(id));
    rankedIds.forEach((ranked) => {
      unranked.forEach((unrankedId) => {
        winsAgainst[ranked][unrankedId]++;
      });
    });
  });

  // Calculate wins and losses for each candidate
  const stats: Record<string, { wins: number; losses: number }> = {};
  candidateIds.forEach((id) => {
    stats[id] = { wins: 0, losses: 0 };
  });

  // For each pair, determine the head-to-head winner
  for (let i = 0; i < candidateIds.length; i++) {
    for (let j = i + 1; j < candidateIds.length; j++) {
      const a = candidateIds[i];
      const b = candidateIds[j];
      const aWins = winsAgainst[a][b];
      const bWins = winsAgainst[b][a];

      if (aWins > bWins) {
        stats[a].wins++;
        stats[b].losses++;
      } else if (bWins > aWins) {
        stats[b].wins++;
        stats[a].losses++;
      }
      // Ties don't affect win/loss counts
    }
  }

  // Check for Condorcet winner (beats everyone: wins === n - 1)
  const condorcetWinner = candidateIds.find((id) => stats[id].wins === n - 1);

  // Build rankings sorted by Copeland score (wins - losses), then by wins
  const rankings: CondorcetRanking[] = candidateIds
    .map((id) => ({
      candidateId: id,
      wins: stats[id].wins,
      losses: stats[id].losses,
    }))
    .sort((a, b) => {
      const scoreA = a.wins - a.losses;
      const scoreB = b.wins - b.losses;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return 0; // Don't use alphabetical here - we'll use tie-breaker
    });

  // Determine winner
  let winner: string | null = null;
  let tieBreaker: 'head-to-head' | 'coin-flip' | undefined;

  if (condorcetWinner) {
    // Clear Condorcet winner - no tie-breaking needed
    winner = condorcetWinner;
  } else if (rankings.length > 0) {
    // No Condorcet winner - check for ties at the top of Copeland rankings
    const topScore = rankings[0].wins - rankings[0].losses;
    const topWins = rankings[0].wins;
    const tiedForFirst = rankings.filter(
      (r) => r.wins - r.losses === topScore && r.wins === topWins
    );

    if (tiedForFirst.length === 1) {
      winner = tiedForFirst[0].candidateId;
    } else {
      // Use head-to-head tie-breaker among the tied candidates
      const tiedIds = tiedForFirst.map((r) => r.candidateId);
      const result = breakTie(tiedIds, votes, false);
      winner = result.winnerId;
      tieBreaker = result.method;
    }
  }

  return {
    winner,
    rankings,
    totalVotes: votes.length,
    noCondorcetWinner: !condorcetWinner,
    tieBreaker,
  };
}
