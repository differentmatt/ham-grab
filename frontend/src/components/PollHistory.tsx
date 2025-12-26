import { Link } from 'react-router-dom';
import { getPollHistory } from '../storage';

export function PollHistory() {
  const history = getPollHistory();

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold text mb-4">Your Polls</h2>
      <div className="space-y-2">
        {history.map((poll) => {
          const url = poll.isAdmin && poll.adminToken
            ? `/poll/${poll.pollId}?admin=${poll.adminToken}`
            : `/poll/${poll.pollId}`;

          return (
            <Link
              key={poll.pollId}
              to={url}
              className="block bg-card hover:bg-white rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text font-medium truncate">
                    {poll.title}
                  </h3>
                  <p className="text-sm text-muted mt-1">
                    {poll.isAdmin ? '👑 Admin' : '🎬 Voter'} • {formatDate(poll.lastVisited)}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-muted ml-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    // Show "Today at 3:45 PM"
    return `Today at ${date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    })}`;
  }

  // Show date and time for older entries (e.g., "Dec 25 at 3:45 PM" or "Dec 25, 2024 at 3:45 PM")
  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });

  return `${dateStr} at ${timeStr}`;
}
