import type { Movie, Vote, RCVResult, RCVRound } from './types';

// Head-to-head comparison: returns the movie that wins/loses most matchups
// Returns { movieId, needsCoinFlip }
function breakTieHeadToHead(tiedIds: string[], ballots: string[][], findWeakest = false): { movieId: string; needsCoinFlip: boolean } {
  if (tiedIds.length === 1) return { movieId: tiedIds[0], needsCoinFlip: false };

  // Count head-to-head wins and losses for each tied movie
  const wins: Record<string, number> = {};
  const losses: Record<string, number> = {};
  tiedIds.forEach(id => {
    wins[id] = 0;
    losses[id] = 0;
  });

  // Compare each pair of tied movies
  for (let i = 0; i < tiedIds.length; i++) {
    for (let j = i + 1; j < tiedIds.length; j++) {
      const movieA = tiedIds[i];
      const movieB = tiedIds[j];

      let aWins = 0;
      let bWins = 0;

      // Count how many ballots rank A higher than B
      ballots.forEach(ballot => {
        const aIndex = ballot.indexOf(movieA);
        const bIndex = ballot.indexOf(movieB);

        // Only count if both are ranked
        if (aIndex !== -1 && bIndex !== -1) {
          if (aIndex < bIndex) aWins++;
          else if (bIndex < aIndex) bWins++;
        }
      });

      // Award win/loss to the movies
      if (aWins > bWins) {
        wins[movieA]++;
        losses[movieB]++;
      } else if (bWins > aWins) {
        wins[movieB]++;
        losses[movieA]++;
      }
      // If tied, neither gets a win or loss
    }
  }

  // Sort by head-to-head wins (or losses if finding weakest)
  let sorted: [string, number][];
  if (findWeakest) {
    // When finding weakest, sort by wins (ascending), then by losses (descending)
    // Movies with fewer wins and more losses are weaker
    sorted = Object.entries(wins).sort((a, b) => {
      if (a[1] !== b[1]) return a[1] - b[1]; // Fewer wins = weaker
      // If wins are equal, more losses = weaker
      return losses[b[0]] - losses[a[0]];
    });
  } else {
    // When finding strongest, sort by wins (descending), then by losses (ascending)
    sorted = Object.entries(wins).sort((a, b) => {
      if (a[1] !== b[1]) return b[1] - a[1]; // More wins = stronger
      // If wins are equal, fewer losses = stronger
      return losses[a[0]] - losses[b[0]];
    });
  }

  // Check if there's still a tie (multiple movies with the same win count AND loss count)
  const topWinCount = sorted[0][1];
  const topLossCount = losses[sorted[0][0]];
  const stillTied = sorted.filter(([id, winCount]) =>
    winCount === topWinCount && losses[id] === topLossCount
  );

  if (stillTied.length > 1) {
    // Coin flip needed! Use deterministic selection based on movie IDs
    // Sort by movieId to ensure consistent results across page loads
    const sortedByIdTied = stillTied.sort((a, b) => a[0].localeCompare(b[0]));
    return { movieId: sortedByIdTied[0][0], needsCoinFlip: true };
  }

  return { movieId: sorted[0][0], needsCoinFlip: false };
}

export function calculateRCV(movies: Movie[], votes: Vote[]): RCVResult {
  if (movies.length === 0 || votes.length === 0) {
    return { winner: null, rounds: [], totalVotes: 0 };
  }

  const rounds: RCVRound[] = [];
  let remainingMovies = movies.map((m) => m.movieId);
  const ballots = votes.map((v) =>
    [...v.rankings.filter((id) => remainingMovies.includes(id))]
  );

  while (remainingMovies.length > 1) {
    // Count first-choice votes
    const counts: Record<string, number> = {};
    remainingMovies.forEach((id) => (counts[id] = 0));

    ballots.forEach((ballot) => {
      const firstChoice = ballot.find((id) => remainingMovies.includes(id));
      if (firstChoice) counts[firstChoice]++;
    });

    const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
    const round: RCVRound = {
      counts: { ...counts },
      eliminated: null,
      totalVotes,
    };

    // Check for majority winner
    const majority = totalVotes / 2;
    const winner = Object.entries(counts).find(
      ([, count]) => count > majority
    );

    if (winner) {
      rounds.push(round);
      return { winner: winner[0], rounds, totalVotes: votes.length };
    }

    // Eliminate lowest (tie-break: head-to-head comparison)
    const minVotes = Math.min(...Object.values(counts));
    const losers = Object.entries(counts)
      .filter(([, count]) => count === minVotes)
      .map(([id]) => id);

    // Use head-to-head to break ties - eliminate the weakest one
    let eliminated: string;
    let eliminationReason: 'last-place' | 'head-to-head' | 'coin-flip';

    if (losers.length > 1) {
      // Multiple movies tied for last place
      const result = breakTieHeadToHead(losers, ballots, true);
      eliminated = result.movieId;
      eliminationReason = result.needsCoinFlip ? 'coin-flip' : 'head-to-head';
    } else {
      // Clear last place
      eliminated = losers[0];
      eliminationReason = 'last-place';
    }

    round.eliminated = eliminated;
    round.eliminationReason = eliminationReason;
    rounds.push(round);

    remainingMovies = remainingMovies.filter((id) => id !== eliminated);
  }

  return {
    winner: remainingMovies[0] || null,
    rounds,
    totalVotes: votes.length,
  };
}
