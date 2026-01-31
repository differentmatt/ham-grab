import type {
  Movie,
  Vote,
  VotingMethod,
  RCVResult,
  BordaResult,
  CondorcetResult,
} from './types';
import { calculateRCV } from './rcv';
import { calculateBorda } from './borda';
import { calculateCondorcet } from './condorcet';

export type VotingResult = RCVResult | BordaResult | CondorcetResult;

export function calculateResults(
  method: VotingMethod,
  movies: Movie[],
  votes: Vote[]
): VotingResult {
  switch (method) {
    case 'rcv':
      return calculateRCV(movies, votes);
    case 'borda':
      return calculateBorda(movies, votes);
    case 'condorcet':
      return calculateCondorcet(movies, votes);
    default:
      return calculateBorda(movies, votes); // Fallback
  }
}

// Type guards for result types
export function isRCVResult(result: VotingResult): result is RCVResult {
  return 'rounds' in result;
}

export function isBordaResult(result: VotingResult): result is BordaResult {
  return 'scores' in result && 'maxPossibleScore' in result;
}

export function isCondorcetResult(
  result: VotingResult
): result is CondorcetResult {
  return 'rankings' in result && 'noCondorcetWinner' in result;
}

// Voting method metadata for UI
export const VOTING_METHODS: Record<
  VotingMethod,
  {
    name: string;
    description: string;
  }
> = {
  borda: {
    name: 'Borda Count',
    description:
      'Points-based ranking. Best for finding consensus when you have many options.',
  },
  condorcet: {
    name: 'Condorcet',
    description:
      'Head-to-head matchups. Finds the option most acceptable to everyone.',
  },
  rcv: {
    name: 'Ranked Choice (IRV)',
    description:
      'Eliminates last-place each round. Best when voters have strong preferences.',
  },
};
