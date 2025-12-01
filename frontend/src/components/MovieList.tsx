import { useState } from 'react';
import { api } from '../api';
import type { Movie } from '../types';

interface MovieListProps {
  movies: Movie[];
  pollType: 'movie' | 'other';
  isAdmin: boolean;
  pollId: string;
  adminToken?: string;
  onUpdate: () => void;
}

export function MovieList({
  movies,
  pollType,
  isAdmin,
  pollId,
  adminToken,
  onUpdate,
}: MovieListProps) {
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (movieId: string) => {
    if (!adminToken) return;
    setRemoving(movieId);
    try {
      await api.removeMovie(pollId, movieId, adminToken);
      onUpdate();
    } catch (err) {
      console.error('Failed to remove movie:', err);
    } finally {
      setRemoving(null);
    }
  };

  const itemLabel = pollType === 'movie' ? 'movies' : 'items';

  if (movies.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        No {itemLabel} added yet. Be the first!
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {movies.map((movie) => (
        <li
          key={movie.movieId}
          className="flex items-center justify-between bg-surface rounded-lg px-4 py-3 shadow"
        >
          <div className="min-w-0 flex-1">
            <span className="text block truncate font-medium">{movie.title}</span>
            <span className="text-muted text-sm">
              added by {movie.addedBy}
            </span>
            {pollType === 'movie' && movie.description && (
              <p className="text-muted text-sm mt-1 italic">
                {movie.description}
              </p>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => handleRemove(movie.movieId)}
              disabled={removing === movie.movieId}
              className="ml-3 text-red-500 hover:text-red-600 text-sm flex-shrink-0 disabled:opacity-50 font-medium"
            >
              {removing === movie.movieId ? '...' : 'Remove'}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
