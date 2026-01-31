import { useState } from 'react';
import {
  calculateResults,
  isRCVResult,
  isBordaResult,
  isCondorcetResult,
  VOTING_METHODS,
} from '../voting';
import type { Poll, Movie, Vote, RCVResult, BordaResult, CondorcetResult, VotingMethod } from '../types';

interface ResultsProps {
  poll: Poll;
}

export function Results({ poll }: ResultsProps) {
  const defaultMethod = poll.votingMethod || 'rcv';
  const [selectedMethod, setSelectedMethod] = useState<VotingMethod>(defaultMethod);
  const result = calculateResults(selectedMethod, poll.movies, poll.votes || []);
  const getMovie = (id: string) => poll.movies.find((m) => m.movieId === id);
  const methodInfo = VOTING_METHODS[selectedMethod];
  const isUsingOriginalMethod = selectedMethod === defaultMethod;

  if (result.totalVotes === 0) {
    return (
      <div className="text-center py-12 text-muted">
        No votes were submitted.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Winner */}
      {result.winner && (
        <div className="bg-gradient-to-r from-yellow-600 to-amber-600 rounded-xl p-6 text-center">
          <div className="text-yellow-200 text-sm mb-1">Winner</div>
          <div className="text-white text-xl sm:text-2xl font-bold">
            {getMovie(result.winner)?.title}
          </div>
          {poll.pollType === 'movie' && getMovie(result.winner)?.description && (
            <div className="text-yellow-100 text-sm mt-2 italic">
              {getMovie(result.winner)?.description}
            </div>
          )}
        </div>
      )}

      {/* Vote Count & Method Selector */}
      <div className="bg-surface rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-muted">
            <span className="font-medium">{result.totalVotes}</span> vote
            {result.totalVotes !== 1 ? 's' : ''} cast
          </span>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value as VotingMethod)}
            className="text-xs bg-card border border-border rounded px-2 py-1 text cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {(Object.keys(VOTING_METHODS) as VotingMethod[]).map((m) => (
              <option key={m} value={m}>
                {VOTING_METHODS[m].name}
                {m === defaultMethod ? ' (original)' : ''}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted mt-1">{methodInfo.description}</p>
        {!isUsingOriginalMethod && (
          <p className="text-xs text-blue-400 mt-1">
            Showing alternate results. Original method was {VOTING_METHODS[defaultMethod].name}.
          </p>
        )}
      </div>

      {/* Method-specific results */}
      {isRCVResult(result) && (
        <RCVResultsDisplay result={result} getMovie={getMovie} winner={result.winner} />
      )}
      {isBordaResult(result) && (
        <BordaResultsDisplay result={result} getMovie={getMovie} />
      )}
      {isCondorcetResult(result) && (
        <CondorcetResultsDisplay result={result} getMovie={getMovie} />
      )}

      {/* Individual Votes */}
      {poll.votes && poll.votes.length > 0 && (
        <IndividualVotes votes={poll.votes} getMovie={getMovie} />
      )}
    </div>
  );
}

interface RCVResultsDisplayProps {
  result: RCVResult;
  getMovie: (id: string) => Movie | undefined;
  winner: string | null;
}

function RCVResultsDisplay({ result, getMovie, winner }: RCVResultsDisplayProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted mb-3">Voting Rounds</h3>
      <div className="space-y-4">
        {result.rounds.map((round, i) => (
          <div key={i} className="bg-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-muted">Round {i + 1}</div>
              {round.eliminationReason === 'coin-flip' && (
                <div className="text-xs text-amber-400 flex items-center gap-1">
                  <span>Coin flip tiebreaker</span>
                </div>
              )}
              {round.eliminationReason === 'head-to-head' && (
                <div className="text-xs text-blue-400 flex items-center gap-1">
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
                    round.totalVotes > 0 ? (count / round.totalVotes) * 100 : 0;
                  const isEliminated = round.eliminated === id;
                  const isWinner = i === result.rounds.length - 1 && id === winner;

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
                    <div key={id} className={isEliminated ? 'opacity-50' : ''}>
                      <div className="flex justify-between text-sm mb-1">
                        <span
                          className={`truncate ${isWinner ? 'text-yellow-400' : 'text'}`}
                        >
                          {movie?.title}
                          {isEliminated && (
                            <span className="text-red-400 ml-2">
                              {getEliminationText()}
                            </span>
                          )}
                          {isWinner && <span className="text-yellow-400 ml-2">✓</span>}
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
  );
}

interface BordaResultsDisplayProps {
  result: BordaResult;
  getMovie: (id: string) => Movie | undefined;
}

function BordaResultsDisplay({ result, getMovie }: BordaResultsDisplayProps) {
  const sortedScores = Object.entries(result.scores).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted">Borda Scores</h3>
        {result.tieBreaker === 'head-to-head' && (
          <div className="text-xs text-blue-400">Head-to-head tiebreaker</div>
        )}
        {result.tieBreaker === 'coin-flip' && (
          <div className="text-xs text-amber-400">Coin flip tiebreaker</div>
        )}
      </div>
      <div className="bg-card rounded-xl p-4 space-y-3">
        {sortedScores.map(([id, score], index) => {
          const movie = getMovie(id);
          const percentage =
            result.maxPossibleScore > 0
              ? (score / result.maxPossibleScore) * 100
              : 0;
          const isWinner = id === result.winner;

          return (
            <div key={id}>
              <div className="flex justify-between text-sm mb-1">
                <span className={isWinner ? 'text-yellow-400' : 'text'}>
                  {index + 1}. {movie?.title}
                  {isWinner && <span className="ml-2">✓</span>}
                </span>
                <span className="text-muted ml-2">{score} pts</span>
              </div>
              <div className="h-2 bg-white rounded-full overflow-hidden">
                <div
                  className={`h-full ${isWinner ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CondorcetResultsDisplayProps {
  result: CondorcetResult;
  getMovie: (id: string) => Movie | undefined;
}

function CondorcetResultsDisplay({ result, getMovie }: CondorcetResultsDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Condorcet winner status */}
      {result.noCondorcetWinner && (
        <div className="text-xs text-muted bg-surface px-3 py-2 rounded-lg">
          No Condorcet winner exists (no option beats all others). Winner
          determined by Copeland score (wins minus losses).
          {result.tieBreaker === 'head-to-head' && (
            <span className="ml-1">Tie broken by head-to-head comparison.</span>
          )}
          {result.tieBreaker === 'coin-flip' && (
            <span className="ml-1">Tie broken by coin flip.</span>
          )}
        </div>
      )}

      {/* Rankings by Copeland score */}
      <div>
        <h3 className="text-sm font-medium text-muted mb-3">
          Head-to-Head Rankings
        </h3>
        <div className="bg-card rounded-xl p-4 space-y-2">
          {result.rankings.map((r, index) => {
            const movie = getMovie(r.candidateId);
            const isWinner = r.candidateId === result.winner;
            const copelandScore = r.wins - r.losses;

            return (
              <div
                key={r.candidateId}
                className="flex justify-between items-center py-1"
              >
                <span className={isWinner ? 'text-yellow-400' : 'text'}>
                  {index + 1}. {movie?.title}
                  {isWinner && <span className="ml-2">✓</span>}
                </span>
                <span className="text-muted text-sm">
                  {r.wins}W - {r.losses}L
                  <span className="ml-2 text-xs">
                    ({copelandScore >= 0 ? '+' : ''}
                    {copelandScore})
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface IndividualVotesProps {
  votes: Vote[];
  getMovie: (id: string) => Movie | undefined;
}

function IndividualVotes({ votes, getMovie }: IndividualVotesProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted mb-3">Individual Votes</h3>
      <div className="space-y-2">
        {votes.map((vote) => (
          <div key={vote.voteId} className="bg-card rounded-xl p-4">
            <div className="text font-medium mb-1">{vote.nickname}</div>
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
  );
}
