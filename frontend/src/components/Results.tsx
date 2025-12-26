import { calculateRCV } from '../rcv';
import type { Poll } from '../types';

interface ResultsProps {
  poll: Poll;
}

export function Results({ poll }: ResultsProps) {
  const { winner, rounds, totalVotes } = calculateRCV(
    poll.movies,
    poll.votes || []
  );

  const getMovie = (id: string) => poll.movies.find((m) => m.movieId === id);

  if (totalVotes === 0) {
    return (
      <div className="text-center py-12 text-muted">
        No votes were submitted.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Winner */}
      {winner && (
        <div className="bg-gradient-to-r from-yellow-600 to-amber-600 rounded-xl p-6 text-center">
          <div className="text-yellow-200 text-sm mb-1">🏆 Winner</div>
          <div className="text-white text-xl sm:text-2xl font-bold">
            {getMovie(winner)?.title}
          </div>
          {poll.pollType === 'movie' && getMovie(winner)?.description && (
            <div className="text-yellow-100 text-sm mt-2 italic">
              {getMovie(winner)?.description}
            </div>
          )}
        </div>
      )}

      {/* Vote Count */}
      <div className="text-muted">
        <span className="font-medium">{totalVotes}</span> vote
        {totalVotes !== 1 ? 's' : ''} cast
      </div>

      {/* Rounds */}
      <div>
        <h3 className="text-sm font-medium text-muted mb-3">
          Voting Rounds
        </h3>
        <div className="space-y-4">
          {rounds.map((round, i) => (
            <div key={i} className="bg-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-muted">Round {i + 1}</div>
                {round.eliminationReason === 'coin-flip' && (
                  <div className="text-xs text-amber-400 flex items-center gap-1">
                    <span>🪙</span>
                    <span>Coin flip tiebreaker</span>
                  </div>
                )}
                {round.eliminationReason === 'head-to-head' && (
                  <div className="text-xs text-blue-400 flex items-center gap-1">
                    <span>⚔️</span>
                    <span>Head-to-head tiebreaker</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {Object.entries(round.counts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, count]) => {
                    const movie = getMovie(id);
                    const percentage =
                      round.totalVotes > 0
                        ? (count / round.totalVotes) * 100
                        : 0;
                    const isEliminated = round.eliminated === id;
                    const isWinner = i === rounds.length - 1 && id === winner;

                    const getEliminationText = () => {
                      if (!isEliminated) return null;
                      switch (round.eliminationReason) {
                        case 'coin-flip':
                          return '(eliminated by coin flip)';
                        case 'head-to-head':
                          return '(eliminated - lost head-to-head)';
                        case 'last-place':
                          return '(eliminated - fewest votes)';
                        default:
                          return '(eliminated)';
                      }
                    };

                    return (
                      <div
                        key={id}
                        className={isEliminated ? 'opacity-50' : ''}
                      >
                        <div className="flex justify-between text-sm mb-1">
                          <span
                            className={`truncate ${
                              isWinner ? 'text-yellow-400' : 'text'
                            }`}
                          >
                            {movie?.title}
                            {isEliminated && (
                              <span className="text-red-400 ml-2">
                                {getEliminationText()}
                              </span>
                            )}
                            {isWinner && (
                              <span className="text-yellow-400 ml-2">✓</span>
                            )}
                          </span>
                          <span className="text-muted ml-2 flex-shrink-0">
                            {count} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-white rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isWinner ? 'bg-yellow-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Votes */}
      {poll.votes && poll.votes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted mb-3">
            Individual Votes
          </h3>
          <div className="space-y-2">
            {poll.votes.map((vote) => (
              <div key={vote.voteId} className="bg-card rounded-xl p-4">
                <div className="text font-medium mb-1">
                  {vote.nickname}
                </div>
                <div className="text-muted text-sm">
                  {vote.rankings
                    .map((id) => getMovie(id)?.title)
                    .filter(Boolean)
                    .join(' → ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
