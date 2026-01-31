import type { Vote } from './types';

export interface TieBreakerResult {
  winnerId: string;
  method: 'head-to-head' | 'coin-flip';
}

/**
 * Breaks a tie between candidates using head-to-head ballot comparisons.
 * Falls back to deterministic "coin flip" (alphabetical by ID) if still tied.
 *
 * @param tiedIds - Array of candidate IDs that are tied
 * @param votes - All votes cast (used for head-to-head comparison)
 * @param findWeakest - If true, finds the weakest candidate (for elimination). If false, finds strongest (for winning).
 */
export function breakTie(
  tiedIds: string[],
  votes: Vote[],
  findWeakest = false
): TieBreakerResult {
  if (tiedIds.length === 1) {
    return { winnerId: tiedIds[0], method: 'head-to-head' };
  }

  const ballots = votes.map((v) => v.rankings);

  // Count head-to-head wins and losses for each tied candidate
  const wins: Record<string, number> = {};
  const losses: Record<string, number> = {};
  tiedIds.forEach((id) => {
    wins[id] = 0;
    losses[id] = 0;
  });

  // Compare each pair of tied candidates
  for (let i = 0; i < tiedIds.length; i++) {
    for (let j = i + 1; j < tiedIds.length; j++) {
      const candidateA = tiedIds[i];
      const candidateB = tiedIds[j];

      let aWins = 0;
      let bWins = 0;

      // Count how many ballots rank A higher than B
      ballots.forEach((ballot) => {
        const aIndex = ballot.indexOf(candidateA);
        const bIndex = ballot.indexOf(candidateB);

        // Only count if both are ranked
        if (aIndex !== -1 && bIndex !== -1) {
          if (aIndex < bIndex) aWins++;
          else if (bIndex < aIndex) bWins++;
        }
      });

      // Award win/loss to the candidates
      if (aWins > bWins) {
        wins[candidateA]++;
        losses[candidateB]++;
      } else if (bWins > aWins) {
        wins[candidateB]++;
        losses[candidateA]++;
      }
      // If tied, neither gets a win or loss
    }
  }

  // Sort by head-to-head wins (or losses if finding weakest)
  let sorted: [string, number][];
  if (findWeakest) {
    // When finding weakest, sort by wins (ascending), then by losses (descending)
    sorted = Object.entries(wins).sort((a, b) => {
      if (a[1] !== b[1]) return a[1] - b[1]; // Fewer wins = weaker
      return losses[b[0]] - losses[a[0]]; // More losses = weaker
    });
  } else {
    // When finding strongest, sort by wins (descending), then by losses (ascending)
    sorted = Object.entries(wins).sort((a, b) => {
      if (a[1] !== b[1]) return b[1] - a[1]; // More wins = stronger
      return losses[a[0]] - losses[b[0]]; // Fewer losses = stronger
    });
  }

  // Check if there's still a tie
  const topWinCount = sorted[0][1];
  const topLossCount = losses[sorted[0][0]];
  const stillTied = sorted.filter(
    ([id, winCount]) => winCount === topWinCount && losses[id] === topLossCount
  );

  if (stillTied.length > 1) {
    // Coin flip: deterministic selection based on candidate IDs
    const sortedById = stillTied.sort((a, b) => a[0].localeCompare(b[0]));
    return { winnerId: sortedById[0][0], method: 'coin-flip' };
  }

  return { winnerId: sorted[0][0], method: 'head-to-head' };
}
