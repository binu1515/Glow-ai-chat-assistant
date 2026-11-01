import React, { useState, useEffect } from 'react';
import { X, Database, Zap, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Layers, Info } from 'lucide-react';
import { fetchCacheStats, invalidateCache } from '../services/api';
import { useTheme } from '../context/ThemeContext';

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

  const { isDark } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl ${
        isDark ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center space-x-2.5">
            <Database className="h-5 w-5 text-cyan-500" />
            <div>
              <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Data caching & Performance monitor</h2>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Backend: {stats?.backend || 'Redis'} • Status: {stats?.status || 'Active'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadStats}
              disabled={loading}
              className={`rounded-lg p-1.5 transition ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
              title="Refresh Stats"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className={`rounded-lg p-1.5 transition ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {feedback && (
            <div className={`flex items-center space-x-2 rounded-lg border p-3 ${
              isDark ? 'border-cyan-800 bg-cyan-950/40 text-cyan-300' : 'border-cyan-200 bg-cyan-50 text-cyan-800'
            }`}>
              <CheckCircle2 className="h-4 w-4" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Caching Metrics Overview */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80 shadow-xs'}`}>
                <div className={`flex items-center justify-between mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Cache Hits</span>
                  <Zap className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-500">
                  {stats.hits}
                </div>
                <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Zero latency responses</div>
              </div>

              <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80 shadow-xs'}`}>
                <div className={`flex items-center justify-between mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Cache Misses</span>
                  <Database className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-blue-500">
                  {stats.misses}
                </div>
                <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>External calls made</div>
              </div>

              <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80 shadow-xs'}`}>
                <div className={`flex items-center justify-between mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Hit Ratio</span>
                  <Layers className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-purple-500">
                  {stats.hit_ratio_percent}%
                </div>
                <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Cache efficiency</div>
              </div>

              <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80 shadow-xs'}`}>
                <div className={`flex items-center justify-between mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Cached Keys</span>
                  <Database className="h-4 w-4 text-cyan-500" />
                </div>
                <div className="text-2xl font-bold font-mono text-cyan-500">
                  {stats.cached_keys_count}
                </div>
                <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Active in memory/Redis</div>
              </div>
            </div>
          )}

          {/* Caching Strategy Explanation Card */}
          <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50/80 shadow-xs'}`}>
            <div className={`flex items-center space-x-2 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <Info className="h-4 w-4 text-blue-500" />
              <span>Caching Strategy & Architecture</span>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              External tools (Weather forecasts, geocoding lookups, and document chunk search results) are cached in Redis with granular TTLs:
            </p>
            <ul className={`list-disc pl-5 text-[11px] space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <li><strong className={isDark ? 'text-slate-300' : 'text-slate-800'}>Weather API:</strong> 10-minute TTL (600s) — eliminates repetitive queries to Open-Meteo for the same city.</li>
              <li><strong className={isDark ? 'text-slate-300' : 'text-slate-800'}>Document Search:</strong> 5-minute TTL (300s) — caches scored passages per query; automatically flushed whenever a new document is uploaded or deleted.</li>
              <li><strong className={isDark ? 'text-slate-300' : 'text-slate-800'}>Fallback Protection:</strong> If Redis is momentarily down, an in-memory TTL dictionary automatically handles caching with zero interruption.</li>
            </ul>
          </div>

          {/* Granular Cache Invalidation Controls */}
          <div>
            <h3 className={`font-semibold mb-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>Cache Invalidation Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <button
                onClick={() => handleInvalidate('cache:weather:*', 'Weather Only')}
                disabled={invalidating}
                className={`flex items-center justify-center space-x-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition ${
                  isDark
                    ? 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-xs'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5 text-cyan-500" />
                <span>Flush Weather Cache</span>
              </button>

              <button
                onClick={() => handleInvalidate('cache:doc_search:*', 'Document Searches')}
                disabled={invalidating}
                className={`flex items-center justify-center space-x-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition ${
                  isDark
                    ? 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-xs'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5 text-indigo-500" />
                <span>Flush Document Cache</span>
              </button>

              <button
                onClick={() => handleInvalidate('*', 'All Cache')}
                disabled={invalidating}
                className={`flex items-center justify-center space-x-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition ${
                  isDark
                    ? 'border-rose-800/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50'
                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 shadow-xs'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Purge Entire Cache (*)</span>
              </button>
            </div>
          </div>

          {/* Active Cached Keys Preview */}
          {stats?.active_keys?.length > 0 && (
            <div>
              <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Active Cached Keys in Memory</h3>
              <div className={`max-h-36 overflow-y-auto rounded-xl border p-2.5 font-mono text-[11px] space-y-1 ${
                isDark ? 'border-slate-800 bg-slate-950 text-cyan-300' : 'border-slate-200 bg-slate-900 text-cyan-300'
              }`}>
                {stats.active_keys.map((k) => (
                  <div key={k} className="truncate rounded bg-slate-800/60 px-2 py-1">
                    {k}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end border-t px-6 py-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

