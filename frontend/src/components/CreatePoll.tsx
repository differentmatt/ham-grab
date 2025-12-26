import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { addPollToHistory } from '../storage';
import { PollHistory } from './PollHistory';

export function CreatePoll() {
  const [title, setTitle] = useState('');
  const [pollType, setPollType] = useState<'movie' | 'other'>('movie');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dailyPollCount, setDailyPollCount] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const navigate = useNavigate();

  // Fetch daily poll stats on mount
  useEffect(() => {
    api.getStats().then(stats => {
      setDailyPollCount(stats.dailyPollCount);
      setDailyLimit(stats.dailyLimit);
    }).catch(() => {
      // Silently fail - counter is not critical
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await api.createPoll(title.trim(), pollType);
      addPollToHistory({
        pollId: result.pollId,
        title: result.title,
        isAdmin: true,
        adminToken: result.adminToken,
        lastVisited: Date.now(),
      });
      navigate(`/poll/${result.pollId}?admin=${result.adminToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-md mx-auto px-4 py-8 sm:py-16">
        <div className="text-center mb-8">
          <img
            src="/og-image.png"
            alt="Ham Grab"
            className="w-full max-w-sm mx-auto rounded-xl shadow-2xl mb-4"
          />
          <p className="text-muted">
            Create a ranked choice voting poll
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-lg">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-muted mb-2"
          >
            Poll Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={pollType === 'movie' ? 'e.g., Friday Night Movie' : 'e.g., Team Lunch Spot'}
            className="w-full px-4 py-3 bg-input border border-border rounded-lg text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={loading}
          />

          <div className="mt-4">
            <label className="block text-sm font-medium text-muted mb-2">
              Poll Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="pollType"
                  value="movie"
                  checked={pollType === 'movie'}
                  onChange={(e) => setPollType(e.target.value as 'movie' | 'other')}
                  className="w-4 h-4 text-primary bg-input border-border focus:ring-primary focus:ring-2"
                  disabled={loading}
                />
                <span className="ml-2 text">Movie</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="pollType"
                  value="other"
                  checked={pollType === 'other'}
                  onChange={(e) => setPollType(e.target.value as 'movie' | 'other')}
                  className="w-4 h-4 text-primary bg-input border-border focus:ring-primary focus:ring-2"
                  disabled={loading}
                />
                <span className="ml-2 text">Other</span>
              </label>
            </div>
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={!title.trim() || loading}
            className="mt-4 w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-md"
          >
            {loading ? 'Creating...' : 'Create Poll'}
          </button>

          {dailyPollCount !== null && dailyLimit !== null && (
            <p className="mt-2 text-xs text-muted text-center">
              {dailyPollCount} {dailyPollCount === 1 ? 'poll' : 'polls'} created today ({dailyLimit.toLocaleString()} limit)
            </p>
          )}
        </form>
      </div>

      <PollHistory />
    </>
  );
}
