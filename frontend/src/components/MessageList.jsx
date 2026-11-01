import React, { useEffect, useRef } from 'react';
import { User, Bot, AlertCircle } from 'lucide-react';
import ToolExecutionCard from './ToolExecutionCard';

export function formatUserFriendlyError(raw) {
  if (!raw) return 'The AI service encountered a temporary issue. Please try again.';
  const str = String(raw);

  if (
    str.includes('function call turn comes immediately after') ||
    str.includes('INVALID_ARGUMENT') ||
    str.includes('sequence conflict')
  ) {
    return 'The AI model encountered a temporary conversation sequence conflict while executing tools. Context has been refreshed—please try re-sending your question or start a fresh chat.';
  }
  if (str.includes('not found') || str.includes('no longer available') || str.includes('404')) {
    return 'The requested AI model is unavailable or has been deprecated. Please choose an active model (such as Gemini 3.5 Flash Lite or GPT-4o Mini) in Settings.';
  }
  if (str.includes('429') || str.includes('quota') || str.includes('rate limit')) {
    return 'API rate limit or quota reached. Please wait a moment before sending another message.';
  }
  if (str.includes('401') || str.includes('Unauthorized') || str.includes('invalid_api_key')) {
    return 'Invalid or missing API key. Please check your credentials in the Model Settings menu.';
  }
  if (str.includes('timeout') || str.includes('Timeout') || str.includes('unreachable')) {
    return 'Connection timed out while waiting for the AI or tool response. Please check your network and try again.';
  }
  if (str.includes('context_length_exceeded') || str.includes('maximum context length')) {
    return 'Conversation context limit reached for this model. Try starting a new chat or reducing the memory window in Settings.';
  }

  // Clean raw Python exception formatting / JSON dumps
  let cleaned = str
    .replace(/^Error:\s*/i, '')
    .replace(/Error calling model '[^']+':\s*/i, '')
    .replace(/\s*\{'message':\s*'\{[\s\S]*\}\',\s*'status':\s*'[^']+'\}/i, '')
    .trim();

  return cleaned.length > 0 ? cleaned : 'An unexpected error occurred while communicating with the AI service.';
}

export default function MessageList({ messages, isStreaming, currentStreamingMessage, streamingTools }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamingMessage, isStreaming, streamingTools]);

  const renderContent = (rawContent) => {
    if (!rawContent) return null;

    let content = rawContent;
    if (typeof content === 'string') {
      // 1. Sanitize any raw Python/JSON message block representations (e.g. [{'type': 'text', 'text': '...'}])
      if (content.trim().startsWith("[{'type':") || content.trim().startsWith('[{"type":')) {
        const match = content.match(/['"]text['"]:\s*['"]((?:\\.|[^'"\\])*)['"]/);
        if (match && match[1]) {
          content = match[1].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"');
        }
      }

      // 2. Remove robotic bracketed tool citations e.g. "(via the get_weather tool)"
      content = content.replace(/\s*\(\s*via\s+the\s+`?[a-zA-Z0-9_]+`?\s+tool\s*\)/gi, '');

      // 3. Clean redundant duplicate location brackets e.g. "Vyttila, Kerala, India (Vyttila, Kochi, India)"
      content = content.replace(/([a-zA-Z\s]+,\s*[a-zA-Z\s]+,\s*[a-zA-Z\s]+)\s*\([^)]*\)/g, '$1');

      // 4. Clean bracketed Fahrenheit into user-friendly slash notation e.g. "26.3°C (79.3°F)" -> "26.3°C / 79.3°F"
      content = content.replace(/(\d+(?:\.\d+)?°C)\s*\(\s*(\d+(?:\.\d+)?°F)\s*\)/g, '$1 / $2');
    }

    // Simple robust markdown parser for paragraphs, code blocks, bold, inline code, and lists
    const lines = content.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeBlockContent = [];
    let codeBlockLang = '';

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${idx}`} className="my-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs font-mono text-cyan-300 border border-slate-800">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeBlockLang = line.replace('```', '').trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemText = line.trim().substring(2);
        elements.push(
          <li key={`li-${idx}`} className="ml-4 list-disc text-sm text-slate-200">
            {formatInline(itemText)}
          </li>
        );
        return;
      }

      if (line.startsWith('### ')) {
        elements.push(<h3 key={`h3-${idx}`} className="text-base font-semibold text-slate-100 mt-2 mb-1">{line.replace('### ', '')}</h3>);
        return;
      }

      if (line.startsWith('## ')) {
        elements.push(<h2 key={`h2-${idx}`} className="text-lg font-bold text-slate-100 mt-3 mb-1">{line.replace('## ', '')}</h2>);
        return;
      }

      if (line.startsWith('# ')) {
        elements.push(<h1 key={`h1-${idx}`} className="text-xl font-bold text-slate-100 mt-4 mb-2">{line.replace('# ', '')}</h1>);
        return;
      }

      if (line.trim() === '') {
        elements.push(<div key={`sp-${idx}`} className="h-2" />);
        return;
      }

      elements.push(
        <p key={`p-${idx}`} className="text-sm leading-relaxed text-slate-200 mb-1">
          {formatInline(line)}
        </p>
      );
    });

    if (inCodeBlock && codeBlockContent.length > 0) {
      elements.push(
        <pre key="code-unclosed" className="my-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs font-mono text-cyan-300 border border-slate-800">
          <code>{codeBlockContent.join('\n')}</code>
        </pre>
      );
    }

    return elements;
  };

  const formatInline = (text) => {
    // Replace bold **text** and inline `code`
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="rounded bg-slate-800/80 px-1.5 py-0.5 text-xs font-mono text-sky-400">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {messages.length === 0 && !isStreaming && (
        <div className="flex h-full flex-col items-center justify-center text-center p-8 text-slate-400">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg mb-4">
            <Bot className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Full-Stack AI Assistant with MCP</h2>
          <p className="max-w-md text-sm text-slate-400 mb-6">
            Equipped with Model Context Protocol (MCP) tools for real-time math evaluation, live weather forecasting, and document semantic search.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl text-left text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 hover:border-slate-700">
              <span className="font-semibold text-amber-400">Calculator MCP Tool</span>
              <p className="text-slate-400 mt-1">"Calculate sqrt(144) * (25 - 5) + sin(pi / 4)"</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 hover:border-slate-700">
              <span className="font-semibold text-cyan-400">Weather MCP Tool</span>
              <p className="text-slate-400 mt-1">"What is the current weather and humidity in Tokyo?"</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 hover:border-slate-700">
              <span className="font-semibold text-indigo-400">Document Search Tool</span>
              <p className="text-slate-400 mt-1">"Search uploaded policy for Redis caching and token rules"</p>
            </div>
          </div>
        </div>
      )}

      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isError = msg.role === 'error';

        return (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                isUser
                  ? 'bg-blue-600 text-white'
                  : isError
                  ? 'bg-rose-600 text-white'
                  : 'bg-indigo-600/30 text-indigo-300 ring-1 ring-indigo-500/30'
              }`}
            >
              {isUser ? <User className="h-4 w-4" /> : isError ? <AlertCircle className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`relative max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${
                isUser
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : isError
                  ? 'bg-rose-950/40 border border-rose-800/60 text-rose-200 rounded-tl-none'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-none'
              }`}
            >
              {/* Tool invocations if any */}
              {msg.tool_calls && msg.tool_calls.length > 0 && (
                <div className="mb-3 space-y-2">
                  {msg.tool_calls.map((tc, idx) => {
                    const matchedResult = msg.tool_results?.find((tr) => tr.name === tc.name);
                    return (
                      <ToolExecutionCard
                        key={tc.id || idx}
                        tool={tc.name}
                        arguments={tc.arguments}
                        result={matchedResult?.result}
                        cacheHit={matchedResult?.cache_hit || false}
                        isRunning={false}
                      />
                    );
                  })}
                </div>
              )}

              {/* Message Content */}
              {isError ? (
                <div className="space-y-1.5">
                  <div className="font-semibold text-rose-300 text-xs flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Unable to Complete Request</span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed font-sans">
                    {formatUserFriendlyError(msg.content)}
                  </p>
                  {(msg.raw_error || (typeof msg.content === 'string' && (msg.content.includes('{') || msg.content.includes('Error calling model')))) && (
                    <details className="mt-2 text-[11px] text-rose-400/80 cursor-pointer">
                      <summary className="hover:text-rose-300 transition select-none">Technical Details</summary>
                      <pre className="mt-1 max-h-32 overflow-x-auto whitespace-pre-wrap rounded bg-slate-950/80 p-2 font-mono text-[10px] text-rose-300/80 border border-rose-900/40">
                        {msg.raw_error || msg.content}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <div>{renderContent(msg.content)}</div>
              )}

              {/* Timestamp */}
              {msg.created_at && (
                <div className="mt-1 text-right text-[10px] text-slate-400/80">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Real-time Streaming Message */}
      {isStreaming && (
        <div className="flex items-start space-x-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-300 ring-1 ring-indigo-500/30">
            <Bot className="h-4 w-4" />
          </div>

          <div className="relative max-w-[85%] md:max-w-[75%] rounded-2xl rounded-tl-none bg-slate-900/90 border border-slate-800 px-4 py-3 shadow-md">
            {/* Live Tool Execution Status */}
            {streamingTools && streamingTools.length > 0 && (
              <div className="mb-3 space-y-2">
                {streamingTools.map((st, i) => (
                  <ToolExecutionCard
                    key={st.id || i}
                    tool={st.tool}
                    arguments={st.arguments}
                    result={st.result}
                    cacheHit={st.cacheHit}
                    isRunning={st.isRunning}
                  />
                ))}
              </div>
            )}

            {/* Live Streaming Content with Cursor */}
            <div>
              {renderContent(currentStreamingMessage)}
              <span className="cursor-blink" />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

