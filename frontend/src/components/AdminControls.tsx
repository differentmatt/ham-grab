import { useState } from 'react';
import { api } from '../api';
import type { Poll } from '../types';

interface AdminControlsProps {
  poll: Poll;
  pollId: string;
  adminToken: string;
  onUpdate: () => void;
}

export function AdminControls({
  poll,
  pollId,
  adminToken,
  onUpdate,
}: AdminControlsProps) {
  const [loading, setLoading] = useState(false);

  const changePhase = async (phase: Poll['phase']) => {
    setLoading(true);
    try {
      await api.updatePhase(pollId, phase, adminToken);
      onUpdate();
    } catch (err) {
      console.error('Failed to update phase:', err);
    } finally {
      setLoading(false);
    }
  };

  const itemLabel = poll.pollType === 'movie' ? 'movies' : 'items';

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 mb-6 shadow-lg">
      <h2 className="text-sm font-medium text-muted mb-4">Admin Controls</h2>

      <div className="flex flex-wrap gap-2">
        {poll.phase === 'nominating' && (
          <button
            onClick={() => changePhase('voting')}
            disabled={poll.movies.length < 2 || loading}
            className="px-4 py-2 bg-success hover:bg-success-hover disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-md"
          >
            {loading ? 'Updating...' : 'Close Nominations & Open Voting'}
          </button>
        )}

        {poll.phase === 'voting' && (
          <button
            onClick={() => changePhase('closed')}
            disabled={loading}
            className="px-4 py-2 bg-warning hover:bg-warning-hover disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-md"
          >
            {loading ? 'Updating...' : 'Close Voting & Show Results'}
          </button>
        )}

        {poll.phase === 'closed' && (
          <button
            onClick={() => changePhase('voting')}
            disabled={loading}
            className="px-4 py-2 bg-surface hover:bg-card disabled:opacity-50 text text-sm font-medium rounded-lg transition-colors shadow-md"
          >
            {loading ? 'Updating...' : 'Reopen Voting'}
          </button>
        )}
      </div>

      {poll.phase === 'nominating' && poll.movies.length < 2 && (
        <p className="mt-3 text-sm text-muted">
          Need at least 2 {itemLabel} to start voting
        </p>
      )}
    </div>
  );
}
