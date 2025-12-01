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
