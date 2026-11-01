import React, { useState } from 'react';
import { Calculator, CloudSun, FileText, CheckCircle2, Loader2, Zap, Database, ChevronDown, ChevronRight } from 'lucide-react';

export default function ToolExecutionCard({ tool, arguments: args, result, cacheHit, isRunning }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolMeta = () => {
    switch (tool) {
      case 'calculate':
        return {
          icon: <Calculator className="w-4 h-4 text-amber-400" />,
          title: 'MCP Calculator',
          summary: args?.expression ? `Expression: ${args.expression}` : 'Evaluating math...',
        };
      case 'get_weather':
        return {
          icon: <CloudSun className="w-4 h-4 text-cyan-400" />,
          title: 'MCP Weather Service',
          summary: args?.location ? `Location: ${args.location}` : 'Fetching weather...',
        };
      case 'search_document':
        return {
          icon: <FileText className="w-4 h-4 text-indigo-400" />,
          title: 'MCP Document Search',
          summary: args?.query ? `Query: "${args.query}"` : 'Searching passages...',
        };
      default:
        return {
          icon: <Database className="w-4 h-4 text-slate-400" />,
          title: tool || 'MCP Tool',
          summary: JSON.stringify(args || {}),
        };
    }
  };

  const meta = getToolMeta();

  return (
    <div className="my-2 rounded-lg border border-slate-700/60 bg-slate-900/70 p-3 shadow-sm transition hover:border-slate-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800">
            {meta.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {meta.title}
              </span>
              {isRunning ? (
                <span className="flex items-center text-xs text-amber-400">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Running...
                </span>
              ) : (
                <span className="flex items-center text-xs text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Executed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{meta.summary}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Cache Indicator Badge */}
          {cacheHit ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
              <Zap className="w-3 h-3 mr-1 text-emerald-400" />
              Redis Hit
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/30">
              <Database className="w-3 h-3 mr-1 text-blue-400" />
              Fresh Fetch
            </span>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            title="Toggle execution details"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-3 border-t border-slate-800 pt-2 text-xs">
          <div className="mb-2">
            <span className="font-semibold text-slate-400">Arguments:</span>
            <pre className="mt-1 rounded bg-slate-950 p-2 font-mono text-slate-300">
              {JSON.stringify(args || {}, null, 2)}
            </pre>
          </div>
          {result && (
            <div>
              <span className="font-semibold text-slate-400">Result Output:</span>
              <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-slate-950 p-2 font-mono text-emerald-300">
                {typeof result === 'object' ? JSON.stringify(result, null, 2) : result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

