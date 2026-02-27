import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Clock, Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const STAGES = [
  { label: 'Payment confirmed', done: true },
  { label: 'Building your CRM', key: 'generated' },
  { label: 'Deploying your website', key: 'deployed' },
  { label: 'Sending your credentials', key: 'deployed' },
];

export default function SignupSuccess() {
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customer');
  const [status, setStatus] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!customerId) return;

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/v1/factory/public/signup/status/${customerId}`);
        const data = await res.json();
        setStatus(data);

        // Stop polling once deployed
        if (data.status === 'deployed' || data.status === 'active') return;

        // Poll every 15 seconds, up to 20 minutes
        if (pollCount < 80) {
          setTimeout(() => setPollCount(c => c + 1), 15000);
        }
      } catch (err) {
        console.error('Status poll failed:', err);
      }
    };

    poll();
  }, [customerId, pollCount]);

  const isDeployed = status?.status === 'deployed' || status?.status === 'active';
  const isBuilding = status?.status === 'generated' || status?.status === 'pending_payment';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full">
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Confirmed!</h1>
          <p className="text-slate-500">Your stack is being built right now. This takes about 5–10 minutes.</p>
        </div>

        {/* Status card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="text-sm font-semibold text-slate-700 mb-4">Build Progress</div>
          <div className="space-y-4">
            {STAGES.map((stage, i) => {
              const isDone = stage.done ||
                (stage.key === 'generated' && (status?.status === 'generated' || isDeployed)) ||
                (stage.key === 'deployed' && isDeployed);
              const isActive = !isDone && (
                (stage.key === 'generated' && isBuilding) ||
                (stage.key === 'deployed' && status?.status === 'generated')
              );

              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    isDone ? 'bg-emerald-100' : isActive ? 'bg-blue-100' : 'bg-slate-100'
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <span className={`text-sm ${isDone ? 'text-slate-900 font-medium' : isActive ? 'text-blue-700 font-medium' : 'text-slate-400'}`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deployed state */}
        {isDeployed && status && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
            <div className="font-semibold text-emerald-900 mb-3">🎉 You're live!</div>
            <div className="space-y-2 text-sm">
              {status.deployedUrl && (
                <div>
                  <span className="text-emerald-700 font-medium">CRM: </span>
                  <a href={status.deployedUrl} target="_blank" rel="noopener noreferrer"
                     className="text-emerald-600 underline">{status.deployedUrl}</a>
                </div>
              )}
              {status.siteUrl && (
                <div>
                  <span className="text-emerald-700 font-medium">Website: </span>
                  <a href={status.siteUrl} target="_blank" rel="noopener noreferrer"
                     className="text-emerald-600 underline">{status.siteUrl}</a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Check your email.</strong> We'll send your login credentials and direct links to your CRM and website as soon as the build is complete.
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="https://twomiah.com" className="text-sm text-slate-400 hover:text-slate-600">← Back to Twomiah</a>
        </div>
      </div>
    </div>
  );
}
