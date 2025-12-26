import { useState, useMemo, useEffect } from 'react';
import { api } from '../api';
import { getStoredName, setStoredName, getVoterKey, getVoteDraft, saveVoteDraft } from '../storage';
import type { Poll } from '../types';

interface VotingInterfaceProps {
  poll: Poll;
  pollId: string;
  onVoted: () => void;
}

export function VotingInterface({ poll, pollId, onVoted }: VotingInterfaceProps) {
  const itemLabel = poll.pollType === 'movie' ? 'movies' : 'items';
  const itemLabelSingular = poll.pollType === 'movie' ? 'movie' : 'item';

  // Check if user has already voted (only available if poll is closed)
  const voterKey = getVoterKey();
  const existingVote = poll.votes?.find((v) => v.voteId === voterKey);

  // Check localStorage for draft
  const voteDraft = getVoteDraft(pollId);

  // Initialize rankings from draft, existing vote, or empty
  const initialRankings = useMemo(() => {
    // Prefer draft (more recent) over existing vote
    const source = voteDraft || existingVote;
    if (source) {
      // Filter out any movie IDs that no longer exist in the poll
      return source.rankings.filter((id) =>
        poll.movies.some((m) => m.movieId === id)
      );
    }
    return [];
  }, [voteDraft, existingVote, poll.movies]);

  const initialUnranked = useMemo(() => {
    const rankedIds = new Set(initialRankings);
    return poll.movies
      .map((m) => m.movieId)
      .filter((id) => !rankedIds.has(id));
  }, [initialRankings, poll.movies]);

  const initialNickname = voteDraft?.nickname || existingVote?.nickname || getStoredName();

  const [nickname, setNickname] = useState(initialNickname);
  const [rankings, setRankings] = useState<string[]>(initialRankings);
  const [unranked, setUnranked] = useState<string[]>(initialUnranked);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Save draft whenever rankings or nickname changes
  useEffect(() => {
    if (rankings.length > 0 || nickname.trim()) {
      saveVoteDraft(pollId, rankings, nickname);
    }
  }, [rankings, nickname, pollId]);

  const getMovie = (id: string) => poll.movies.find((m) => m.movieId === id);

  // Drag handlers
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDropOnRanked = (targetIndex: number) => {
    if (!draggedId) return;

    const newUnranked = unranked.filter((id) => id !== draggedId);
    const newRankings = rankings.filter((id) => id !== draggedId);
    newRankings.splice(targetIndex, 0, draggedId);

    setUnranked(newUnranked);
    setRankings(newRankings);
    setDraggedId(null);
  };

  const handleDropOnUnranked = () => {
    if (!draggedId) return;

    const newRankings = rankings.filter((id) => id !== draggedId);
    const newUnranked = unranked.filter((id) => id !== draggedId);
    newUnranked.push(draggedId);

    setRankings(newRankings);
    setUnranked(newUnranked);
    setDraggedId(null);
  };

  // Mobile: tap to move
  const moveToRanked = (id: string) => {
    setUnranked((prev) => prev.filter((x) => x !== id));
    setRankings((prev) => [...prev, id]);
  };

  const moveToUnranked = (id: string) => {
    setRankings((prev) => prev.filter((x) => x !== id));
    setUnranked((prev) => [...prev, id]);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newRankings = [...rankings];
    [newRankings[index - 1], newRankings[index]] = [
      newRankings[index],
      newRankings[index - 1],
    ];
    setRankings(newRankings);
  };

  const moveDown = (index: number) => {
    if (index === rankings.length - 1) return;
    const newRankings = [...rankings];
    [newRankings[index], newRankings[index + 1]] = [
      newRankings[index + 1],
      newRankings[index],
    ];
    setRankings(newRankings);
  };

  const handleSubmit = async () => {
    if (!nickname.trim() || rankings.length === 0 || loading) return;

    setLoading(true);
    setError('');

    try {
      setStoredName(nickname.trim());
      await api.submitVote(pollId, getVoterKey(), nickname.trim(), rankings);
      onVoted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Name Input */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">
          Your Name
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter your name"
          className="w-full px-4 py-3 bg-input border border-border rounded-lg text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Rankings */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ranked List */}
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">
            Your Rankings
          </h3>
          <div
            className={`min-h-[180px] bg-card rounded-xl p-3 space-y-2 transition-colors ${
              draggedId && !rankings.includes(draggedId) ? 'drag-over' : ''
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDropOnRanked(rankings.length)}
          >
            {rankings.length === 0 ? (
              <div className="text-muted text-center py-8 text-sm">
                Tap {itemLabel} to rank them
              </div>
            ) : (
              rankings.map((id, index) => (
                <div
                  key={id}
                  draggable
                  onDragStart={() => handleDragStart(id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDropOnRanked(index);
                  }}
                  className={`flex items-center gap-2 bg-surface rounded-lg px-3 py-2 cursor-move ${
                    draggedId === id ? 'dragging' : ''
                  }`}
                >
                  <span className="text-primary font-bold w-6 text-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text text-sm truncate">
                      {getMovie(id)?.title}
                    </div>
                    {poll.pollType === 'movie' && getMovie(id)?.description && (
                      <div className="text-muted text-xs mt-0.5 line-clamp-2">
                        {getMovie(id)?.description}
                      </div>
                    )}
                  </div>
                  {/* Mobile/tablet controls */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-muted disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === rankings.length - 1}
                      className="p-1 text-muted disabled:opacity-30"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => moveToUnranked(id)}
                      className="p-1 text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unranked List */}
        <div>
          <h3 className="text-sm font-medium text-muted mb-2">
            Available {poll.pollType === 'movie' ? 'Movies' : 'Items'}
          </h3>
          <div
            className={`min-h-[180px] bg-card rounded-xl p-3 space-y-2 transition-colors ${
              draggedId && rankings.includes(draggedId) ? 'drag-over' : ''
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnUnranked}
          >
            {unranked.length === 0 ? (
              <div className="text-muted text-center py-8 text-sm">
                All {itemLabel} ranked!
              </div>
            ) : (
              unranked.map((id) => (
                <div
                  key={id}
                  draggable
                  onDragStart={() => handleDragStart(id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => moveToRanked(id)}
                  className={`bg-surface rounded-lg px-3 py-2 cursor-pointer hover:bg-card transition-colors ${
                    draggedId === id ? 'dragging' : ''
                  }`}
                >
                  <div className="text text-sm">
                    {getMovie(id)?.title}
                  </div>
                  {poll.pollType === 'movie' && getMovie(id)?.description && (
                    <div className="text-muted text-xs mt-0.5">
                      {getMovie(id)?.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!nickname.trim() || rankings.length === 0 || loading}
        className="w-full py-3 px-4 bg-success hover:bg-success-hover disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-md"
      >
        {loading
          ? 'Submitting...'
          : `Submit Vote (${rankings.length} ${rankings.length !== 1 ? itemLabel : itemLabelSingular} ranked)`}
      </button>

      <p className="text-muted text-sm text-center">
        You can change your vote until voting closes.
      </p>
    </div>
  );
}
