import React, { useState, useEffect } from 'react';
import { X, BarChart3, Coins, ArrowUpRight, ArrowDownLeft, Layers, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { fetchAnalytics } from '../services/api';

export default function TokenDashboard({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err.message || 'Failed to load token analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-white">LLM Token Usage & Cost Monitoring</h2>
              <p className="text-[11px] text-slate-400">
                Live metrics collected directly from LLM response metadata
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Refresh Analytics"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs text-slate-300">
          {error && (
            <div className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-rose-300">
              {error}
            </div>
          )}

          {/* Active Model Indicator */}
          {analytics && (
            <div className="flex items-center justify-between rounded-xl bg-slate-950/80 p-3.5 border border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-slate-300 font-medium">Currently Selected LLM:</span>
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-blue-400 font-mono font-semibold uppercase">
                  {analytics.active_provider}
                </span>
                <span className="font-mono text-white font-semibold">{analytics.active_model}</span>
              </div>
              <span className="text-slate-400">Total Invocations: {analytics.total_requests}</span>
            </div>
          )}

          {/* 4 Key Performance Indicator (KPI) Metric Cards */}
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total Tokens */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="font-medium">Total Tokens</span>
                  <Layers className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {analytics.total_tokens.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Prompt + Completion</div>
              </div>

              {/* Input Tokens */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="font-medium">Prompt Tokens</span>
                  <ArrowDownLeft className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-xl font-bold font-mono text-blue-400">
                  {analytics.total_prompt_tokens.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Input context</div>
              </div>

              {/* Output Tokens */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="font-medium">Completion Tokens</span>
                  <ArrowUpRight className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="text-xl font-bold font-mono text-cyan-400">
                  {analytics.total_completion_tokens.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Generated output</div>
              </div>

              {/* Estimated Cost */}
              <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
                <div className="flex items-center justify-between text-emerald-400 mb-1">
                  <span className="font-medium">Estimated Cost</span>
                  <Coins className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-300">
                  ${analytics.total_cost_usd.toFixed(6)}
                </div>
                <div className="text-[10px] text-emerald-500/80 mt-1">USD based on pricing table</div>
              </div>
            </div>
          )}

          {/* Breakdown By Model */}
          {analytics?.by_model?.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-2 flex items-center space-x-1.5">
                <span>Token Consumption By Model</span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                    <tr>
                      <th className="p-3">Model</th>
                      <th className="p-3">Provider</th>
                      <th className="p-3 text-right">Calls</th>
                      <th className="p-3 text-right">Prompt Tokens</th>
                      <th className="p-3 text-right">Completion Tokens</th>
                      <th className="p-3 text-right">Total Tokens</th>
                      <th className="p-3 text-right">Est. Cost (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {analytics.by_model.map((m) => (
                      <tr key={m.model} className="hover:bg-slate-900/40">
                        <td className="p-3 font-semibold text-white font-sans">{m.model}</td>
                        <td className="p-3 text-slate-400 uppercase font-sans text-[11px]">{m.provider}</td>
                        <td className="p-3 text-right text-slate-300">{m.total_calls}</td>
                        <td className="p-3 text-right text-blue-400">{m.total_prompt_tokens.toLocaleString()}</td>
                        <td className="p-3 text-right text-cyan-400">{m.total_completion_tokens.toLocaleString()}</td>
                        <td className="p-3 text-right text-purple-400 font-bold">{m.total_tokens.toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-400">${m.total_cost_usd.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Breakdown By Conversation Session */}
          {analytics?.by_session?.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-2">Token Usage Per Conversation Session</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                    <tr>
                      <th className="p-3">Session Title</th>
                      <th className="p-3 text-right">Prompt Tokens</th>
                      <th className="p-3 text-right">Completion Tokens</th>
                      <th className="p-3 text-right">Total Tokens</th>
                      <th className="p-3 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {analytics.by_session.map((s) => (
                      <tr key={s.session_id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-medium text-slate-200 font-sans truncate max-w-xs">{s.session_title}</td>
                        <td className="p-3 text-right text-blue-400">{s.total_prompt_tokens.toLocaleString()}</td>
                        <td className="p-3 text-right text-cyan-400">{s.total_completion_tokens.toLocaleString()}</td>
                        <td className="p-3 text-right text-purple-400 font-bold">{s.total_tokens.toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-400">${s.total_cost_usd.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Token Logs */}
          {analytics?.recent_logs?.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-2">Recent LLM Invocations Log</h3>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 font-mono text-[11px]">
                <table className="w-full text-left">
                  <thead className="sticky top-0 border-b border-slate-800 text-slate-400 bg-slate-900">
                    <tr>
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Model</th>
                      <th className="p-2.5 text-right">Prompt</th>
                      <th className="p-2.5 text-right">Output</th>
                      <th className="p-2.5 text-right">Total</th>
                      <th className="p-2.5 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {analytics.recent_logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="p-2.5 text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-2.5 text-slate-300">{log.model}</td>
                        <td className="p-2.5 text-right text-blue-400">{log.prompt_tokens}</td>
                        <td className="p-2.5 text-right text-cyan-400">{log.completion_tokens}</td>
                        <td className="p-2.5 text-right text-white font-semibold">{log.total_tokens}</td>
                        <td className="p-2.5 text-right text-emerald-400">${log.estimated_cost_usd.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

