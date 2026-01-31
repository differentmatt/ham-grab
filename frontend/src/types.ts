export type VotingMethod = 'borda' | 'condorcet' | 'rcv';

export interface Movie {
  movieId: string;
  title: string;
  addedBy: string;
  addedAt: number;
  description?: string;
  descriptionFetchedAt?: number;
  descriptionAttempted?: boolean;
  descriptionAttemptedAt?: number;
}

export interface Vote {
  voteId: string;
  nickname: string;
  rankings: string[];
  submittedAt: number;
}

export interface Poll {
  pollId: string;
  title: string;
  pollType: 'movie' | 'other';
  votingMethod: VotingMethod;
  groupVoting?: boolean;
  phase: 'nominating' | 'voting' | 'closed';
  createdAt: number;
  movies: Movie[];
  votes?: Vote[];
  voteCount: number;
  isAdmin: boolean;
  adminToken?: string;
}

export interface CreatePollResponse {
  pollId: string;
  adminToken: string;
  title: string;
  pollType: 'movie' | 'other';
  votingMethod: VotingMethod;
  groupVoting?: boolean;
  phase: string;
  dailyPollCount?: number;
}

export interface RCVRound {
  counts: Record<string, number>;
  eliminated: string | null;
  totalVotes: number;
  eliminationReason?: 'last-place' | 'head-to-head' | 'coin-flip';
}

export interface RCVResult {
  winner: string | null;
  rounds: RCVRound[];
  totalVotes: number;
}

export interface BordaResult {
  winner: string | null;
  scores: Record<string, number>;
  totalVotes: number;
  maxPossibleScore: number;
  tieBreaker?: 'head-to-head' | 'coin-flip';
}

export interface CondorcetRanking {
  candidateId: string;
  wins: number;
  losses: number;
}

export interface CondorcetResult {
  winner: string | null;
  rankings: CondorcetRanking[];
  totalVotes: number;
  noCondorcetWinner: boolean;
  tieBreaker?: 'head-to-head' | 'coin-flip';
}
