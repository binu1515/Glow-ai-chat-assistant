import React, { useState } from 'react';
import {
  Calculator,
  CloudSun,
  CloudRain,
  CloudLightning,
  Sun,
  Cloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Zap,
  Database,
  ChevronDown,
  ChevronRight,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Copy,
  Check,
} from 'lucide-react';

export default function ToolExecutionCard({ tool, arguments: args, result, cacheHit, isRunning }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result || '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isError =
    Boolean(result) &&
    typeof result === 'string' &&
    (result.startsWith('Weather Error:') ||
      result.startsWith('Error:') ||
      result.startsWith('Calculation Error:') ||
      result.startsWith('Syntax Error:') ||
      result.toLowerCase().includes('could not find coordinates'));

  // Parser for weather text summary returned by MCP weather tool
  const parseWeather = (raw) => {
    if (!raw || typeof raw !== 'string' || isError) return null;
    const tempMatch = raw.match(/Temperature:\s*([^\n\r]+)/i);
    const feelsMatch = raw.match(/Feels Like:\s*([^\n\r]+)/i);
    const condMatch = raw.match(/Condition:\s*([^\n\r]+)/i);
    const humMatch = raw.match(/Humidity:\s*([^\n\r]+)/i);
    const windMatch = raw.match(/Wind Speed:\s*([^\n\r]+)/i);
    const precipMatch = raw.match(/Precipitation:\s*([^\n\r]+)/i);
    const locMatch = raw.match(/Weather for\s*([^:\n\r]+)/i);

    if (tempMatch || condMatch) {
      // Strip redundant duplicate brackets from location name
      let loc = locMatch ? locMatch[1].trim() : args?.location || 'Unknown Location';
      loc = loc.replace(/\s*\([^)]*\)/g, '').trim();

      // Clean temperature string to user-friendly "25.2°C / 77.4°F" without parentheses
      const cleanTemp = (val) => {
        if (!val) return null;
        return val.replace(/[()]/g, '').replace(/\s*\/\s*/g, ' / ').trim();
      };

      return {
        location: loc,
        temperature: cleanTemp(tempMatch ? tempMatch[1] : null),
        feelsLike: cleanTemp(feelsMatch ? feelsMatch[1] : null),
        condition: condMatch ? condMatch[1].trim() : 'Fair',
        humidity: humMatch ? humMatch[1].trim() : null,
        windSpeed: windMatch ? windMatch[1].trim() : null,
        precipitation: precipMatch ? precipMatch[1].trim() : '0.0 mm',
      };
    }
    return null;
  };

  const weatherData = tool === 'get_weather' ? parseWeather(result) : null;

  const getWeatherIcon = (cond = '') => {
    const c = cond.toLowerCase();
    if (c.includes('thunder') || c.includes('lightning') || c.includes('hail')) {
      return <CloudLightning className="w-5 h-5 text-amber-400" />;
    }
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) {
      return <CloudRain className="w-5 h-5 text-blue-400" />;
    }
    if (c.includes('clear') || c.includes('sunny')) {
      return <Sun className="w-5 h-5 text-amber-300" />;
    }
    if (c.includes('overcast') || c.includes('fog')) {
      return <Cloud className="w-5 h-5 text-slate-300" />;
    }
    return <CloudSun className="w-5 h-5 text-cyan-400" />;
  };

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
    <div className="my-2.5 rounded-xl border border-slate-700/60 bg-slate-900/80 p-3.5 shadow-sm transition-all hover:border-slate-600/80">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 shadow-inner">
            {meta.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                {meta.title}
              </span>
              {isRunning ? (
                <span className="flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 ring-1 ring-inset ring-amber-500/30">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Running...
                </span>
              ) : isError ? (
                <span className="flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400 ring-1 ring-inset ring-rose-500/30">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Failed
                </span>
              ) : (
                <span className="flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Executed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[280px] sm:max-w-[420px]">
              {meta.summary}
            </p>
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
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            title="Toggle raw execution details"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Rich Visual Content Displays (Always visible when result is ready)        */}
      {/* ========================================================================= */}

      {/* 1. Error Display Banner */}
      {!isRunning && isError && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-300">Location Geocoding Warning</p>
              <p className="text-rose-200/90 mt-0.5">{result}</p>
              {tool === 'get_weather' && (
                <div className="mt-2 text-[11px] text-rose-300/80 bg-rose-900/30 p-2 rounded border border-rose-800/40">
                  <span className="font-semibold text-rose-200">💡 Suggestion:</span> Try asking with the primary city name (e.g. <span className="underline font-mono">"weather in Kochi, India"</span> or <span className="underline font-mono">"weather in Vyttila"</span>).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Rich Weather Widget */}
      {!isRunning && weatherData && (
        <div className="mt-3 rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-950/30 via-slate-900/70 to-slate-950 p-3.5 shadow-sm">
          {/* Weather Top Row */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-100 truncate max-w-[220px] sm:max-w-[340px]">
                {weatherData.location}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 rounded-full bg-cyan-950/80 border border-cyan-800/50 px-2.5 py-1 text-xs font-medium text-cyan-300">
              {getWeatherIcon(weatherData.condition)}
              <span>{weatherData.condition}</span>
            </div>
          </div>

          {/* Weather Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
            {/* Temperature */}
            <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 p-2.5 text-center">
              <div className="flex items-center justify-center space-x-1 text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>Temp</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-100 mt-1">
                {weatherData.temperature || 'N/A'}
              </div>
              {weatherData.feelsLike && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Feels {weatherData.feelsLike}
                </div>
              )}
            </div>

            {/* Humidity */}
            <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 p-2.5 text-center">
              <div className="flex items-center justify-center space-x-1 text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span>Humidity</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-100 mt-1">
                {weatherData.humidity || 'N/A'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Relative</div>
            </div>

            {/* Wind Speed */}
            <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 p-2.5 text-center">
              <div className="flex items-center justify-center space-x-1 text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                <Wind className="w-3.5 h-3.5 text-teal-400" />
                <span>Wind</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-100 mt-1">
                {weatherData.windSpeed || 'N/A'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Surface 10m</div>
            </div>

            {/* Precipitation */}
            <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 p-2.5 text-center">
              <div className="flex items-center justify-center space-x-1 text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                <CloudSun className="w-3.5 h-3.5 text-cyan-400" />
                <span>Precip</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-100 mt-1">
                {weatherData.precipitation || '0.0 mm'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Current</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Rich Calculator Result */}
      {!isRunning && !isError && tool === 'calculate' && result && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs">
          <div className="font-mono text-slate-300">
            <span className="text-amber-400 font-semibold">{args?.expression}</span>
            <span className="mx-2 text-slate-500">=</span>
            <span className="font-bold text-emerald-400 text-sm">{result}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700 transition"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}

      {/* 4. Rich Document Search Preview */}
      {!isRunning && !isError && tool === 'search_document' && result && (
        <div className="mt-3 rounded-lg border border-indigo-500/25 bg-indigo-950/20 p-2.5 text-xs">
          <div className="flex items-center justify-between mb-1.5 text-indigo-300 font-medium">
            <span className="flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Matched Passages</span>
            </span>
          </div>
          <pre className="max-h-36 overflow-y-auto whitespace-pre-wrap rounded bg-slate-950/80 p-2 font-mono text-[11px] text-slate-300 border border-slate-800">
            {result}
          </pre>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Collapsible Raw Arguments & Protocol Output Details                       */}
      {/* ========================================================================= */}
      {isExpanded && (
        <div className="mt-3 border-t border-slate-800 pt-2.5 text-xs">
          <div className="mb-2">
            <span className="font-semibold text-slate-400">Arguments:</span>
            <pre className="mt-1 rounded bg-slate-950 p-2 font-mono text-slate-300 text-[11px] border border-slate-800/80">
              {JSON.stringify(args || {}, null, 2)}
            </pre>
          </div>
          {result && (
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-400">Raw Protocol Output:</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-[10px] text-slate-400 hover:text-slate-200"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-slate-950 p-2 font-mono text-emerald-300 text-[11px] border border-slate-800/80">
                {typeof result === 'object' ? JSON.stringify(result, null, 2) : result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
