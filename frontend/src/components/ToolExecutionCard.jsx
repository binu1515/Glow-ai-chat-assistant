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
import { useTheme } from '../context/ThemeContext';

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
  const { isDark } = useTheme();

  return (
    <div className={`my-2.5 rounded-xl border p-3.5 shadow-sm transition-all ${
      isDark
        ? 'border-slate-700/60 bg-slate-900/80 hover:border-slate-600/80'
        : 'border-slate-200 bg-slate-50/90 hover:border-slate-300 shadow-xs'
    }`}>
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-inner ${
            isDark ? 'bg-slate-800' : 'bg-white border border-slate-200'
          }`}>
            {meta.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {meta.title}
              </span>
              {isRunning ? (
                <span className="flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-500 ring-1 ring-inset ring-amber-500/30">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Running...
                </span>
              ) : isError ? (
                <span className="flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-500 ring-1 ring-inset ring-rose-500/30">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Failed
                </span>
              ) : (
                <span className="flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Executed
                </span>
              )}
            </div>
            <p className={`text-xs font-mono mt-0.5 truncate max-w-[280px] sm:max-w-[420px] ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {meta.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Cache Indicator Badge */}
          {cacheHit ? (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
              isDark
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30'
                : 'bg-emerald-50 text-emerald-700 ring-emerald-500/30 font-semibold'
            }`}>
              <Zap className="w-3 h-3 mr-1 text-emerald-500" />
              Redis Hit
            </span>
          ) : (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
              isDark
                ? 'bg-blue-500/10 text-blue-400 ring-blue-500/30'
                : 'bg-blue-50 text-blue-700 ring-blue-500/30 font-semibold'
            }`}>
              <Database className="w-3 h-3 mr-1 text-blue-500" />
              Fresh Fetch
            </span>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`rounded-md p-1.5 transition ${
              isDark
                ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
            }`}
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
        <div className={`mt-3 rounded-lg border p-3 text-xs ${
          isDark
            ? 'border-rose-500/30 bg-rose-950/30 text-rose-200'
            : 'border-rose-200 bg-rose-50 text-rose-900 shadow-xs'
        }`}>
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className={`font-semibold ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>Location Geocoding Warning</p>
              <p className={`mt-0.5 ${isDark ? 'text-rose-200/90' : 'text-rose-700'}`}>{result}</p>
              {tool === 'get_weather' && (
                <div className={`mt-2 text-[11px] p-2 rounded border ${
                  isDark
                    ? 'text-rose-300/80 bg-rose-900/30 border-rose-800/40'
                    : 'text-rose-800 bg-rose-100/70 border-rose-200'
                }`}>
                  <span className="font-semibold">💡 Suggestion:</span> Try asking with the primary city name (e.g. <span className="underline font-mono">"weather in Kochi, India"</span> or <span className="underline font-mono">"weather in Vyttila"</span>).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Rich Weather Widget */}
      {!isRunning && weatherData && (
        <div className={`mt-3 rounded-xl border p-3.5 shadow-sm ${
          isDark
            ? 'border-cyan-500/25 bg-gradient-to-br from-cyan-950/30 via-slate-900/70 to-slate-950'
            : 'border-cyan-200 bg-gradient-to-br from-cyan-50/80 via-white to-blue-50/40'
        }`}>
          {/* Weather Top Row */}
          <div className={`flex items-center justify-between pb-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-cyan-500 shrink-0" />
              <span className={`text-xs font-semibold truncate max-w-[220px] sm:max-w-[340px] ${
                isDark ? 'text-slate-100' : 'text-slate-900 font-bold'
              }`}>
                {weatherData.location}
              </span>
            </div>
            <div className={`flex items-center space-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
              isDark
                ? 'bg-cyan-950/80 border-cyan-800/50 text-cyan-300'
                : 'bg-cyan-100 border-cyan-300 text-cyan-800 font-semibold'
            }`}>
              {getWeatherIcon(weatherData.condition)}
              <span>{weatherData.condition}</span>
            </div>
          </div>

          {/* Weather Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
            {/* Temperature */}
            <div className={`rounded-lg p-2.5 text-center ${
              isDark ? 'bg-slate-900/80 border border-slate-800/80' : 'bg-white border border-slate-200 shadow-xs'
            }`}>
              <div className={`flex items-center justify-center space-x-1 text-[11px] uppercase tracking-wider font-medium ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                <span>Temp</span>
              </div>
              <div className={`text-sm sm:text-base font-bold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {weatherData.temperature || 'N/A'}
              </div>
              {weatherData.feelsLike && (
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Feels {weatherData.feelsLike}
                </div>
              )}
            </div>

            {/* Humidity */}
            <div className={`rounded-lg p-2.5 text-center ${
              isDark ? 'bg-slate-900/80 border border-slate-800/80' : 'bg-white border border-slate-200 shadow-xs'
            }`}>
              <div className={`flex items-center justify-center space-x-1 text-[11px] uppercase tracking-wider font-medium ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                <span>Humidity</span>
              </div>
              <div className={`text-sm sm:text-base font-bold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {weatherData.humidity || 'N/A'}
              </div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Relative</div>
            </div>

            {/* Wind Speed */}
            <div className={`rounded-lg p-2.5 text-center ${
              isDark ? 'bg-slate-900/80 border border-slate-800/80' : 'bg-white border border-slate-200 shadow-xs'
            }`}>
              <div className={`flex items-center justify-center space-x-1 text-[11px] uppercase tracking-wider font-medium ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Wind className="w-3.5 h-3.5 text-teal-500" />
                <span>Wind</span>
              </div>
              <div className={`text-sm sm:text-base font-bold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {weatherData.windSpeed || 'N/A'}
              </div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Surface 10m</div>
            </div>

            {/* Precipitation */}
            <div className={`rounded-lg p-2.5 text-center ${
              isDark ? 'bg-slate-900/80 border border-slate-800/80' : 'bg-white border border-slate-200 shadow-xs'
            }`}>
              <div className={`flex items-center justify-center space-x-1 text-[11px] uppercase tracking-wider font-medium ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <CloudSun className="w-3.5 h-3.5 text-cyan-500" />
                <span>Precip</span>
              </div>
              <div className={`text-sm sm:text-base font-bold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {weatherData.precipitation || '0.0 mm'}
              </div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Current</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Rich Calculator Result */}
      {!isRunning && !isError && tool === 'calculate' && result && (
        <div className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
          isDark
            ? 'border-amber-500/25 bg-amber-950/20'
            : 'border-amber-200 bg-amber-50/70 shadow-xs'
        }`}>
          <div className="font-mono">
            <span className={`font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{args?.expression}</span>
            <span className={`mx-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>=</span>
            <span className={`font-bold text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{result}</span>
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center space-x-1 rounded px-2 py-1 text-[10px] transition ${
              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}

      {/* 4. Rich Document Search Preview */}
      {!isRunning && !isError && tool === 'search_document' && result && (
        <div className={`mt-3 rounded-lg border p-3 text-xs transition-colors ${
          isDark
            ? 'border-indigo-500/25 bg-indigo-950/20'
            : 'border-indigo-200 bg-indigo-50/50 shadow-xs'
        }`}>
          <div className={`flex items-center justify-between mb-2 font-semibold ${
            isDark ? 'text-indigo-300' : 'text-indigo-900'
          }`}>
            <span className="flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Matched Passages</span>
            </span>
          </div>
          <div
            className={`max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg p-3 text-xs leading-relaxed border transition-colors ${
              isDark
                ? 'bg-slate-950/90 text-slate-200 border-slate-800 font-mono text-[11px]'
                : 'bg-white text-slate-800 border-indigo-100/90 shadow-sm font-sans'
            }`}
            style={{
              backgroundColor: isDark ? '#0b0f19' : '#ffffff',
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}
          >
            {result}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Collapsible Raw Arguments & Protocol Output Details                       */}
      {/* ========================================================================= */}
      {isExpanded && (
        <div className={`mt-3 border-t pt-2.5 text-xs ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="mb-2">
            <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Arguments:</span>
            <pre className={`mt-1 rounded p-2 font-mono text-[11px] border ${
              isDark ? 'bg-slate-950 text-slate-300 border-slate-800/80' : 'bg-slate-900 text-cyan-300 border-slate-800'
            }`}>
              {JSON.stringify(args || {}, null, 2)}
            </pre>
          </div>
          {result && (
            <div>
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Raw Protocol Output:</span>
                <button
                  onClick={handleCopy}
                  className={`flex items-center space-x-1 text-[10px] transition ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className={`mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded p-2 font-mono text-[11px] border ${
                isDark ? 'bg-slate-950 text-emerald-300 border-slate-800/80' : 'bg-slate-900 text-emerald-300 border-slate-800'
              }`}>
                {typeof result === 'object' ? JSON.stringify(result, null, 2) : result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
