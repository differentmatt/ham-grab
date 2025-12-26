import { useState } from 'react';
import { api } from '../api';
import { getStoredName, setStoredName } from '../storage';

interface AddMovieProps {
  pollId: string;
  pollType: 'movie' | 'other';
  movieCount: number;
  onAdded: () => void;
}

export function AddMovie({ pollId, pollType, movieCount, onAdded }: AddMovieProps) {
  const [title, setTitle] = useState('');
  const [name, setName] = useState(getStoredName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const itemLabel = pollType === 'movie' ? 'Movie' : 'Item';
  const itemPlaceholder = pollType === 'movie' ? 'Movie title' : 'Item name';
  const limitReached = movieCount >= 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !name.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      setStoredName(name.trim());
      await api.addMovie(pollId, title.trim(), name.trim());
      setTitle('');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to add ${itemLabel.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-xl p-4 sm:p-6 mb-6 shadow-lg"
    >
      <h2 className="text-sm font-medium text-muted mb-4">Add a {itemLabel}</h2>

      {limitReached ? (
        <div className="text-sm text-muted">
          Maximum limit of 20 entries reached. No more {itemLabel.toLowerCase()}s can be added.
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full sm:w-32 px-3 py-2 bg-input border border-border rounded-lg text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={itemPlaceholder}
              className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!title.trim() || !name.trim() || loading}
              className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-surface disabled:text-muted disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-md"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </>
      )}
    </form>
  );
}
