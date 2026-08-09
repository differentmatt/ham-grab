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

  const toggleGroupVoting = async () => {
    setLoading(true);
    try {
      await api.updateGroupVoting(pollId, !poll.groupVoting, adminToken);
      onUpdate();
    } catch (err) {
      console.error('Failed to update group voting:', err);
    } finally {
      setLoading(false);
    }
  };

  const backToNominations = async () => {
    if (poll.voteCount > 0) {
      const confirmed = window.confirm(
        `Returning to Nominations will clear all ${poll.voteCount} vote${poll.voteCount !== 1 ? 's' : ''} submitted so far. Continue?`
      );
      if (!confirmed) return;
    }
    await changePhase('nominating');
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
          <>
            <button
              onClick={() => changePhase('closed')}
              disabled={loading}
              className="px-4 py-2 bg-warning hover:bg-warning-hover disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-md"
            >
              {loading ? 'Updating...' : 'Close Voting & Show Results'}
            </button>
            <button
              onClick={backToNominations}
              disabled={loading}
              className="px-4 py-2 bg-surface hover:bg-card disabled:opacity-50 text-red-500 text-sm font-medium rounded-lg transition-colors shadow-md"
            >
              {loading ? 'Updating...' : 'Back to Nominations'}
            </button>
          </>
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

      {poll.phase === 'nominating' && (
        <div className="mt-4 pt-4 border-t border-border">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={poll.groupVoting}
              onChange={toggleGroupVoting}
              disabled={loading}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary cursor-pointer disabled:cursor-not-allowed"
            />
            <span>
              <span className="text text-sm font-medium">Shared device voting</span>
              <span className="block text-muted text-xs mt-0.5">
                Everyone votes from this one device, taking turns and passing it
                along. Turn off for remote voting where each person uses their own
                device.
              </span>
            </span>
          </label>
        </div>
      )}

      {poll.phase === 'voting' && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text">
            Shared device voting: <span className="font-medium">{poll.groupVoting ? 'On' : 'Off'}</span>
          </p>
          <p className="text-muted text-xs mt-0.5">
            Return to Nominations to change this.
          </p>
        </div>
      )}
    </div>
  );
}
