import { useState, useEffect } from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const POLL_INTERVAL = 5 * 60 * 1000; // check every 5 minutes

export default function StatusBanner() {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const check = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/status`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);
      // Reset dismissed state when a new issue appears
      if (data.overall !== 'ok') setDismissed(false);
    } catch {
      // Silently fail — don't show an error about the error checker
    }
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (!status || status.overall === 'ok' || dismissed) return null;

  const affectedServices = Object.values(status.services)
    .filter(s => s.status !== 'ok' && s.status !== 'unknown')
    .map(s => s.name);

  const isDegraded = status.overall === 'degraded';
  const message = affectedServices.length > 0
    ? `${affectedServices.join(', ')} ${affectedServices.length === 1 ? 'is' : 'are'} currently experiencing issues`
    : 'One or more services are experiencing issues';

  return (
    <div className={`w-full px-4 py-2 flex items-center justify-between text-sm ${
      isDegraded
        ? 'bg-amber-500/15 border-b border-amber-500/30 text-amber-300'
        : 'bg-red-500/15 border-b border-red-500/30 text-red-300'
    }`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>
          <strong>{isDegraded ? 'Service degradation:' : 'Service outage:'}</strong>{' '}
          {message}. Some features may not work as expected.
          {' '}
          <a
            href="https://status.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline opacity-70 hover:opacity-100"
          >
            Check status pages
          </a>
        </span>
      </div>
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <button onClick={check} className="opacity-60 hover:opacity-100 transition-opacity" title="Recheck">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setDismissed(true)} className="opacity-60 hover:opacity-100 transition-opacity" title="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
