interface HandoffScreenProps {
  onNextVoter: () => void;
  onDoneVoting?: () => void;
  voteCount: number;
  isAdmin: boolean;
}

export function HandoffScreen({ onNextVoter, onDoneVoting, voteCount, isAdmin }: HandoffScreenProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <div className="text-4xl mb-4">✓</div>
      <h2 className="text-xl font-bold text mb-2">Vote Submitted!</h2>
      <p className="text-muted mb-6">
        Pass the device to the next voter.
      </p>
      <button
        onClick={onNextVoter}
        className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors shadow-md"
      >
        Next Voter
      </button>
      <p className="text-muted text-sm mt-6">
        {voteCount} vote{voteCount !== 1 ? 's' : ''} submitted so far
      </p>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-muted text-sm mb-3">
          Everyone voted?
        </p>
        {isAdmin && onDoneVoting ? (
          <button
            onClick={onDoneVoting}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Close Voting & Show Results
          </button>
        ) : (
          <p className="text-muted text-xs">
            The poll admin can close voting to reveal results.
          </p>
        )}
      </div>
    </div>
  );
}
