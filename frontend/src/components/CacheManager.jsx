import React, { useState, useEffect } from 'react';
import { X, Database, Zap, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Layers, Info } from 'lucide-react';
import { fetchCacheStats, invalidateCache } from '../services/api';

export default function CacheManager({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalidating, setInvalidating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchCacheStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleInvalidate = async (pattern, label) => {
    setInvalidating(true);
    setFeedback(null);
    try {
      const res = await invalidateCache(pattern);
      setStats(res.current_stats);
      setFeedback(`Successfully purged ${res.keys_invalidated} key(s) matching "${label}".`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback(`Error invalidating cache: ${err.message}`);
    } finally {
      setInvalidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <Database className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Data caching & Performance monitor</h2>
              <p className="text-[11px] text-slate-400">
                Backend: {stats?.backend || 'Redis'} • Status: {stats?.status || 'Active'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadStats}
              disabled={loading}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Refresh Stats"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs text-slate-300">
          {feedback && (
            <div className="flex items-center space-x-2 rounded-lg border border-cyan-800 bg-cyan-950/40 p-3 text-cyan-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Caching Metrics Overview */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Cache Hits</span>
                  <Zap className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {stats.hits}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Zero latency responses</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Cache Misses</span>
                  <Database className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-blue-400">
                  {stats.misses}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">External calls made</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Hit Ratio</span>
                  <Layers className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-purple-400">
                  {stats.hit_ratio_percent}%
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Cache efficiency</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Cached Keys</span>
                  <Database className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-cyan-400">
                  {stats.cached_keys_count}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Active in memory/Redis</div>
              </div>
            </div>
          )}

          {/* Caching Strategy Explanation Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
            <div className="flex items-center space-x-2 text-slate-200 font-semibold">
              <Info className="h-4 w-4 text-blue-400" />
              <span>Caching Strategy & Architecture</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              External tools (Weather forecasts, geocoding lookups, and document chunk search results) are cached in Redis with granular TTLs:
            </p>
            <ul className="list-disc pl-5 text-[11px] space-y-1 text-slate-400">
              <li><strong className="text-slate-300">Weather API:</strong> 10-minute TTL (600s) — eliminates repetitive queries to Open-Meteo for the same city.</li>
              <li><strong className="text-slate-300">Document Search:</strong> 5-minute TTL (300s) — caches scored passages per query; automatically flushed whenever a new document is uploaded or deleted.</li>
              <li><strong className="text-slate-300">Fallback Protection:</strong> If Redis is momentarily down, an in-memory TTL dictionary automatically handles caching with zero interruption.</li>
            </ul>
          </div>

          {/* Granular Cache Invalidation Controls */}
          <div>
            <h3 className="font-semibold text-white mb-2.5">Cache Invalidation Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <button
                onClick={() => handleInvalidate('cache:weather:*', 'Weather Only')}
                disabled={invalidating}
                className="flex items-center justify-center space-x-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Flush Weather Cache</span>
              </button>

              <button
                onClick={() => handleInvalidate('cache:doc_search:*', 'Document Searches')}
                disabled={invalidating}
                className="flex items-center justify-center space-x-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Flush Document Cache</span>
              </button>

              <button
                onClick={() => handleInvalidate('*', 'All Cache')}
                disabled={invalidating}
                className="flex items-center justify-center space-x-2 rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2.5 text-xs font-medium text-rose-300 hover:bg-rose-900/50"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Purge Entire Cache (*)</span>
              </button>
            </div>
          </div>

          {/* Active Cached Keys Preview */}
          {stats?.active_keys?.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-2">Active Cached Keys in Memory</h3>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] text-cyan-300 space-y-1">
                {stats.active_keys.map((k) => (
                  <div key={k} className="truncate rounded bg-slate-900/60 px-2 py-1">
                    {k}
                  </div>
                ))}
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

