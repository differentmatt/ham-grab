const STORAGE_KEYS = {
  NAME: 'movieVoteName',
  VOTER_KEY: 'movieVoteKey',
  POLL_HISTORY: 'movieVotePollHistory',
  VOTE_DRAFT: 'movieVoteDraft',
} as const;

export interface PollHistoryItem {
  pollId: string;
  title: string;
  isAdmin: boolean;
  adminToken?: string;
  lastVisited: number;
}

function generateKey(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getStoredName(): string {
  return localStorage.getItem(STORAGE_KEYS.NAME) || '';
}

export function setStoredName(name: string): void {
  localStorage.setItem(STORAGE_KEYS.NAME, name);
}

export function getVoterKey(): string {
  let key = localStorage.getItem(STORAGE_KEYS.VOTER_KEY);
  if (!key) {
    key = generateKey();
    localStorage.setItem(STORAGE_KEYS.VOTER_KEY, key);
  }
  return key;
}

export function getPollHistory(): PollHistoryItem[] {
  const stored = localStorage.getItem(STORAGE_KEYS.POLL_HISTORY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addPollToHistory(poll: PollHistoryItem): void {
  const history = getPollHistory();
  const existingIndex = history.findIndex(p => p.pollId === poll.pollId);

  if (existingIndex >= 0) {
    // Update existing entry
    history[existingIndex] = { ...history[existingIndex], ...poll, lastVisited: Date.now() };
  } else {
    // Add new entry
    history.unshift({ ...poll, lastVisited: Date.now() });
  }

  // Keep only last 20 polls
  const trimmed = history.slice(0, 20);
  localStorage.setItem(STORAGE_KEYS.POLL_HISTORY, JSON.stringify(trimmed));
}

export interface VoteDraft {
  rankings: string[];
  nickname: string;
  updatedAt: number;
}

export function getVoteDraft(pollId: string): VoteDraft | null {
  const key = `${STORAGE_KEYS.VOTE_DRAFT}_${pollId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveVoteDraft(pollId: string, rankings: string[], nickname: string): void {
  const key = `${STORAGE_KEYS.VOTE_DRAFT}_${pollId}`;
  const draft: VoteDraft = {
    rankings,
    nickname,
    updatedAt: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(draft));
}

export function clearVoteDraft(pollId: string): void {
  const key = `${STORAGE_KEYS.VOTE_DRAFT}_${pollId}`;
  localStorage.removeItem(key);
}

// Generate a fresh unique key for group voting mode
export function generateFreshKey(): string {
  return generateKey();
}
