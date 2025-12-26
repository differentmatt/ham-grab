import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import type { Poll } from '../types';
import { addPollToHistory } from '../storage';
import { ShareLinks } from './ShareLinks';
import { AdminControls } from './AdminControls';
import { AddMovie } from './AddMovie';
import { MovieList } from './MovieList';
import { VotingInterface } from './VotingInterface';
import { Results } from './Results';

export function PollPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const [searchParams] = useSearchParams();
  const adminToken = searchParams.get('admin') || undefined;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voted, setVoted] = useState(false);

  const fetchPoll = useCallback(async () => {
    if (!pollId) return;
    try {
      const data = await api.getPoll(pollId, adminToken);
      setPoll(data);
      setError('');

      // Save to history
      addPollToHistory({
        pollId: data.pollId,
        title: data.title,
        isAdmin: data.isAdmin || false,
        adminToken: data.isAdmin ? adminToken : undefined,
        lastVisited: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load poll');
    } finally {
      setLoading(false);
    }
  }, [pollId, adminToken]);

  useEffect(() => {
    fetchPoll();
    const interval = setInterval(fetchPoll, 3000);
    return () => clearInterval(interval);
  }, [fetchPoll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Poll not found'}</p>
          <a href="/" className="text-primary hover:underline">
            Create a new poll
          </a>
        </div>
      </div>
    );
  }

  const itemLabel = poll.pollType === 'movie' ? 'Movies' : 'Items';
  const itemLabelLower = itemLabel.toLowerCase();

  const phaseLabel = {
    nominating: `Adding ${itemLabel}`,
    voting: 'Voting Open',
    closed: 'Results',
  }[poll.phase];

  const phaseColor = {
    nominating: 'bg-orange-600',
    voting: 'bg-emerald-700',
    closed: 'bg-amber-600',
  }[poll.phase];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Home Button */}
        <Link
        to="/"
        className="inline-flex items-center gap-2 text-muted hover:text transition-colors mb-4 text-sm"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to Home
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text mb-2">
          {poll.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${phaseColor} text`}>
            {phaseLabel}
          </span>
          {poll.isAdmin && (
            <span className="text-xs text-muted">(Admin)</span>
          )}
        </div>
      </div>

      {/* Admin: Share Links */}
      {poll.isAdmin && pollId && adminToken && (
        <ShareLinks pollId={pollId} adminToken={adminToken} />
      )}

      {/* Admin Controls */}
      {poll.isAdmin && pollId && adminToken && (
        <AdminControls
          poll={poll}
          pollId={pollId}
          adminToken={adminToken}
          onUpdate={fetchPoll}
        />
      )}

      {/* Nominating Phase */}
      {poll.phase === 'nominating' && pollId && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <h3 className="text font-medium mb-1 flex items-center gap-2">
              <span>📝</span>
              Phase 1: Add {itemLabel}
            </h3>
            <p className="text-muted text-sm">
              Everyone can add {itemLabelLower} to the poll. Add your suggestions below,
              then the admin will start voting when ready.
            </p>
          </div>
          <AddMovie pollId={pollId} pollType={poll.pollType} movieCount={poll.movies.length} onAdded={fetchPoll} />
          <div className="bg-card rounded-xl p-4 sm:p-6">
            <h2 className="text-sm font-medium text-muted mb-4">
              {itemLabel} ({poll.movies.length})
            </h2>
            <MovieList
              movies={poll.movies}
              pollType={poll.pollType}
              isAdmin={poll.isAdmin}
              pollId={pollId}
              adminToken={adminToken}
              onUpdate={fetchPoll}
            />
          </div>
        </>
      )}

      {/* Voting Phase */}
      {poll.phase === 'voting' && pollId && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <h3 className="text font-medium mb-1 flex items-center gap-2">
              <span>🗳️</span>
              Phase 2: Rank {itemLabel}
            </h3>
            <p className="text-muted text-sm">
              Vote by ranking the {itemLabelLower} from most to least favorite. Drag to reorder,
              or use the arrows to adjust your rankings. Your top choice should be first! You can rank
              as many or as few {itemLabelLower} as you want.
            </p>
          </div>
          {voted ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <p className="text text-lg font-medium mb-2">
                Vote Submitted!
              </p>
              <p className="text-muted mb-4">
                You can change your vote until voting closes.
              </p>
              <button
                onClick={() => setVoted(false)}
                className="px-4 py-2 bg-white hover:bg-warm-200 text text-sm rounded-lg transition-colors"
              >
                Change My Vote
              </button>
            </div>
          ) : (
            <VotingInterface
              poll={poll}
              pollId={pollId}
              onVoted={() => setVoted(true)}
            />
          )}
          <p className="mt-4 text-center text-muted">
            {poll.voteCount} vote{poll.voteCount !== 1 ? 's' : ''} submitted
          </p>
        </>
      )}

      {/* Closed: Results */}
      {poll.phase === 'closed' && (
        <>
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <h3 className="text font-medium mb-1 flex items-center gap-2">
              <span>🏆</span>
              Final Results
            </h3>
            <p className="text-muted text-sm">
              Voting is complete! See the winner and how ranked choice voting
              eliminated {itemLabelLower} round by round below.
            </p>
          </div>
          <Results poll={poll} />
        </>
      )}
    </div>
  );
}
