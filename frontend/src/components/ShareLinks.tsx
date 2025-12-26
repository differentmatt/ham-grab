import { useState } from 'react';

interface ShareLinksProps {
  pollId: string;
  adminToken: string;
}

export function ShareLinks({ pollId, adminToken }: ShareLinksProps) {
  const [copied, setCopied] = useState<'voter' | 'admin' | null>(null);

  const baseUrl = `${window.location.origin}/poll/${pollId}`;
  const voterLink = baseUrl;
  const adminLink = `${baseUrl}?admin=${adminToken}`;

  const copy = async (text: string, type: 'voter' | 'admin') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-card rounded-xl p-4 sm:p-6 mb-6">
      <h2 className="text-sm font-medium text-muted mb-4">Share Links</h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-600 block mb-1">
            Voter Link (share with friends)
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={voterLink}
              className="flex-1 min-w-0 px-3 py-2 bg-input border border-border rounded-lg text-sm text-muted truncate"
            />
            <button
              onClick={() => copy(voterLink, 'voter')}
              className="flex-shrink-0 px-3 py-2 bg-surface hover:bg-card text text-sm rounded-lg transition-colors"
            >
              {copied === 'voter' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600 block mb-1">
            Admin Link (keep private)
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={adminLink}
              className="flex-1 min-w-0 px-3 py-2 bg-input border border-border rounded-lg text-sm text-muted truncate"
            />
            <button
              onClick={() => copy(adminLink, 'admin')}
              className="flex-shrink-0 px-3 py-2 bg-surface hover:bg-card text text-sm rounded-lg transition-colors"
            >
              {copied === 'admin' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
