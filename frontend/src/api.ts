import type { Poll, CreatePollResponse, Movie, Vote } from './types';

const API_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  createPoll: (title: string, pollType: 'movie' | 'other'): Promise<CreatePollResponse> =>
    request('/polls', {
      method: 'POST',
      body: JSON.stringify({ title, pollType }),
    }),

  getPoll: (pollId: string, adminToken?: string): Promise<Poll> => {
    const params = adminToken ? `?adminToken=${adminToken}` : '';
    return request(`/polls/${pollId}${params}`);
  },

  updatePhase: (
    pollId: string,
    phase: Poll['phase'],
    adminToken: string
  ): Promise<{ phase: string }> =>
    request(`/polls/${pollId}/phase`, {
      method: 'PUT',
      body: JSON.stringify({ phase, adminToken }),
    }),

  addMovie: (
    pollId: string,
    title: string,
    addedBy: string
  ): Promise<Movie> =>
    request(`/polls/${pollId}/movies`, {
      method: 'POST',
      body: JSON.stringify({ title, addedBy }),
    }),

  removeMovie: (
    pollId: string,
    movieId: string,
    adminToken: string
  ): Promise<{ deleted: boolean }> =>
    request(`/polls/${pollId}/movies/${movieId}?adminToken=${adminToken}`, {
      method: 'DELETE',
    }),

  submitVote: (
    pollId: string,
    oddsKey: string,
    nickname: string,
    rankings: string[]
  ): Promise<Vote> =>
    request(`/polls/${pollId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ oddsKey, nickname, rankings }),
    }),
};
