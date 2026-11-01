import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Sparkles,
  Sliders,
  BarChart3,
  Database,
  FileText,
  Menu,
  Calculator,
  CloudSun,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react';
import MessageList from './MessageList';
import { streamChat } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function ChatInterface({
  session,
  configData,
  onOpenSettings,
  onOpenAnalytics,
  onOpenCache,
  onOpenDocuments,
  onSessionUpdated,
  onToggleSidebar,
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [streamingTools, setStreamingTools] = useState([]);
  const abortControllerRef = useRef(null);
  const { theme, toggleTheme, setTheme, isDark } = useTheme();

  // Sync session messages when switching session
  useEffect(() => {
    if (session?.messages) {
      setMessages(session.messages);
    } else {
      setMessages([]);
    }
    setCurrentStreamingMessage('');
    setStreamingTools([]);
  }, [session?.id]);

  const handleSendMessage = (textToSend = null) => {
    const text = (textToSend || inputText).trim();
    if (!text || isStreaming) return;

    setInputText('');

    // Append optimistic user message
    const tempUserMsg = {
      id: `temp_user_${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsStreaming(true);
    setCurrentStreamingMessage('');
    setStreamingTools([]);

    const payload = {
      session_id: session?.id,
      message: text,
      provider: configData?.active_config?.provider,
      model: configData?.active_config?.model,
      temperature: configData?.active_config?.temperature,
      max_tokens: configData?.active_config?.max_tokens,
      system_prompt: configData?.active_config?.system_prompt,
    };

    let accumulatedContent = '';
    const activeToolsMap = new Map();

    const controller = streamChat(
      payload,
      (eventType, data) => {
        if (eventType === 'session') {
          if (data.session_id && (!session || session.id !== data.session_id)) {
            onSessionUpdated(data.session_id);
          }
        } else if (eventType === 'tool_start') {
          activeToolsMap.set(data.id || data.tool, {
            id: data.id || data.tool,
            tool: data.tool,
            arguments: data.arguments,
            isRunning: true,
          });
          setStreamingTools(Array.from(activeToolsMap.values()));
        } else if (eventType === 'tool_end') {
          const key = data.id || data.tool;
          const current = activeToolsMap.get(key) || { tool: data.tool };
          activeToolsMap.set(key, {
            ...current,
            result: data.result,
            cacheHit: data.cache_hit,
            isRunning: false,
          });
          setStreamingTools(Array.from(activeToolsMap.values()));
        } else if (eventType === 'token') {
          accumulatedContent += data.token;
          setCurrentStreamingMessage(accumulatedContent);
        } else if (eventType === 'done') {
          const finalAssistantMsg = {
            id: data.message_id || `msg_${Date.now()}`,
            role: 'assistant',
            content: data.content || accumulatedContent,
            tool_calls: data.tool_calls,
            tool_results: data.tool_results,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, finalAssistantMsg]);
          setIsStreaming(false);
          setCurrentStreamingMessage('');
          setStreamingTools([]);
          onSessionUpdated(session?.id);
        } else if (eventType === 'error') {
          const errMsg = {
            id: `err_${Date.now()}`,
            role: 'error',
            content: data.error || 'Agent encountered an issue.',
            raw_error: data.raw_error || data.error,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errMsg]);
          setIsStreaming(false);
        }
      },
      (error) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'error',
            content: error.message || 'Connection error with the server.',
            raw_error: error.message,
            created_at: new Date().toISOString(),
          },
        ]);
        setIsStreaming(false);
      },
      () => {
        setIsStreaming(false);
      }
    );

    abortControllerRef.current = controller;
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      if (currentStreamingMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_stopped_${Date.now()}`,
            role: 'assistant',
            content: currentStreamingMessage + ' [Response stopped]',
            created_at: new Date().toISOString(),
          },
        ]);
      }
      setCurrentStreamingMessage('');
      setStreamingTools([]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex flex-1 flex-col h-full relative transition-colors duration-150 ${isDark ? 'bg-slate-900/40' : 'bg-slate-50/70'}`}>
      {/* Top Navigation Bar */}
      <header className={`flex h-16 items-center justify-between border-b px-4 backdrop-blur transition-colors duration-150 ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-white/90 shadow-xs'}`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className={`rounded-lg p-1.5 md:hidden transition ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            title="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {session?.title || 'New Conversation'}
            </h2>
            <div className={`flex items-center space-x-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className={`font-mono ${isDark ? 'text-blue-400 font-medium' : 'text-blue-600 font-semibold'}`}>
                {configData?.active_config?.provider?.toUpperCase() || 'GEMINI'}
              </span>
              <span>•</span>
              <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {configData?.active_config?.model || 'gemini-1.5-flash'}
              </span>
              <span>•</span>
              <span>Temp: {configData?.active_config?.temperature ?? 0.7}</span>
            </div>
          </div>
        </div>

        {/* Quick Toolbar & Theme Toggle on Right Top */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onOpenSettings}
            className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1.5 text-xs transition ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'border-slate-200 bg-slate-100/90 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-xs'
            }`}
            title="Configure Models & API Keys"
          >
            <Sliders className={`h-3.5 w-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            onClick={onOpenAnalytics}
            className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1.5 text-xs transition ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'border-slate-200 bg-slate-100/90 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-xs'
            }`}
            title="View Token Analytics & Costs"
          >
            <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Tokens</span>
          </button>

          <button
            onClick={onOpenCache}
            className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1.5 text-xs transition ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'border-slate-200 bg-slate-100/90 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-xs'
            }`}
            title="Data Caching & Performance Monitor"
          >
            <Database className="h-3.5 w-3.5 text-cyan-500" />
            <span className="hidden sm:inline">Cache</span>
          </button>

          <button
            onClick={onOpenDocuments}
            className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1.5 text-xs transition ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'border-slate-200 bg-slate-100/90 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-xs'
            }`}
            title="Upload Documents for MCP Search"
          >
            <FileText className="h-3.5 w-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Docs</span>
          </button>

          {/* Vertical Divider */}
          <div className={`h-4 w-px mx-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* Light / Dark Theme Toggle Switch on Right Top */}
          <div
            className={`flex items-center rounded-lg border p-0.5 transition ${
              isDark
                ? 'border-slate-800 bg-slate-900'
                : 'border-slate-200 bg-slate-100/90 shadow-xs'
            }`}
            role="group"
            aria-label="Theme toggle"
          >
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center space-x-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                !isDark
                  ? 'bg-white text-amber-600 shadow-sm ring-1 ring-slate-200/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to Light Theme"
            >
              <Sun className={`h-3.5 w-3.5 ${!isDark ? 'text-amber-500 fill-amber-500/20' : 'text-slate-400'}`} />
              <span className="hidden md:inline">Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center space-x-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                isDark
                  ? 'bg-slate-800 text-cyan-300 shadow-sm ring-1 ring-slate-700/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Switch to Dark Theme"
            >
              <Moon className={`h-3.5 w-3.5 ${isDark ? 'text-cyan-400 fill-cyan-400/20' : 'text-slate-400'}`} />
              <span className="hidden md:inline">Dark</span>
            </button>
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        currentStreamingMessage={currentStreamingMessage}
        streamingTools={streamingTools}
      />

      {/* Quick Prompt Suggestions (shown when conversation is clean) */}
      {messages.length === 0 && !isStreaming && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
            <button
              onClick={() => handleSendMessage('What is the current weather and humidity in London?')}
              className={`flex items-center space-x-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                isDark
                  ? 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-500/60 hover:text-cyan-700 shadow-xs'
              }`}
            >
              <CloudSun className="h-3.5 w-3.5 text-cyan-500" />
              <span>Weather in London</span>
            </button>
            <button
              onClick={() => handleSendMessage('Calculate (125 * 8) / 4 + sqrt(225)')}
              className={`flex items-center space-x-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                isDark
                  ? 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-amber-500/50 hover:text-amber-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-amber-500/60 hover:text-amber-700 shadow-xs'
              }`}
            >
              <Calculator className="h-3.5 w-3.5 text-amber-500" />
              <span>Math: (125*8)/4 + sqrt(225)</span>
            </button>
            <button
              onClick={() => handleSendMessage('Search the uploaded company policy for Redis caching and token rules')}
              className={`flex items-center space-x-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                isDark
                  ? 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-500/60 hover:text-indigo-700 shadow-xs'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
              <span>Search Document Policy</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Chat Input Form */}
      <div className={`border-t p-4 transition-colors duration-150 ${isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white/90 shadow-sm'}`}>
        <div className="mx-auto max-w-4xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className={`relative flex items-center rounded-2xl border transition shadow-sm ${
              isDark
                ? 'border-slate-700/80 bg-slate-900/90 shadow-lg focus-within:border-blue-500'
                : 'border-slate-300 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'
            }`}
          >
            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, evaluate math, check live weather, or search uploaded docs..."
              className={`max-h-32 flex-1 resize-none bg-transparent px-4 py-3.5 text-sm outline-none ${
                isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
              }`}
            />

            <div className="flex items-center space-x-2 pr-3">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopStreaming}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow hover:bg-rose-500 transition"
                  title="Stop generation"
                >
                  <Square className="h-4 w-4 fill-white" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 transition"
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>

          <div className={`mt-2 text-center text-[11px] tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Powered by <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Glow.ai</span>
          </div>
        </div>
      </div>
    </div>
  );
}

