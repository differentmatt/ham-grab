interface GroupVotingStartProps {
  onStart: () => void;
  voteCount: number;
}

export function GroupVotingStart({ onStart, voteCount }: GroupVotingStartProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <div className="text-4xl mb-4">🗳️</div>
      <h2 className="text-xl font-bold text mb-2">Group Voting Enabled</h2>
      <p className="text-muted mb-4">
        Multiple people can vote from this device. Each person takes a turn.
      </p>
      <div className="bg-surface rounded-lg p-4 mb-6 text-left">
        <p className="text-sm text font-medium mb-2">Each voter will:</p>
        <ol className="text-sm text-muted space-y-1 list-decimal list-inside">
          <li>Enter their name</li>
          <li>Rank the items</li>
          <li>Submit votes and pass the device</li>
        </ol>
      </div>
      <button
        onClick={onStart}
        className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors shadow-md"
      >
        Start Voting
      </button>
      {voteCount > 0 && (
        <p className="text-muted text-sm mt-6">
          {voteCount} vote{voteCount !== 1 ? 's' : ''} submitted
        </p>
      )}
    </div>
  );
}
