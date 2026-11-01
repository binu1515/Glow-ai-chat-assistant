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
} from 'lucide-react';
import MessageList from './MessageList';
import { streamChat } from '../services/api';

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
    <div className="flex flex-1 flex-col h-full bg-slate-900/40 relative">
      {/* Top Navigation Bar */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/70 px-4 backdrop-blur">
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 md:hidden"
            title="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {session?.title || 'New Conversation'}
            </h2>
            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span className="font-mono text-blue-400 font-medium">
                {configData?.active_config?.provider?.toUpperCase() || 'GEMINI'}
              </span>
              <span>•</span>
              <span className="text-slate-300 font-mono">
                {configData?.active_config?.model || 'gemini-1.5-flash'}
              </span>
              <span>•</span>
              <span>Temp: {configData?.active_config?.temperature ?? 0.7}</span>
            </div>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Configure Models & API Keys"
          >
            <Sliders className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            onClick={onOpenAnalytics}
            className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="View Token Analytics & Costs"
          >
            <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Tokens</span>
          </button>

          <button
            onClick={onOpenCache}
            className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Data Caching & Performance Monitor"
          >
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Cache</span>
          </button>

          <button
            onClick={onOpenDocuments}
            className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title="Upload Documents for MCP Search"
          >
            <FileText className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Docs</span>
          </button>
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
              className="flex items-center space-x-1.5 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition"
            >
              <CloudSun className="h-3.5 w-3.5 text-cyan-400" />
              <span>Weather in London</span>
            </button>
            <button
              onClick={() => handleSendMessage('Calculate (125 * 8) / 4 + sqrt(225)')}
              className="flex items-center space-x-1.5 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition"
            >
              <Calculator className="h-3.5 w-3.5 text-amber-400" />
              <span>Math: (125*8)/4 + sqrt(225)</span>
            </button>
            <button
              onClick={() => handleSendMessage('Search the uploaded company policy for Redis caching and token rules')}
              className="flex items-center space-x-1.5 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-300 hover:border-indigo-500/50 hover:text-indigo-300 transition"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              <span>Search Document Policy</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Chat Input Form */}
      <div className="border-t border-slate-800 bg-slate-950/80 p-4">
        <div className="mx-auto max-w-4xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-center rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-lg focus-within:border-blue-500"
          >
            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, evaluate math, check live weather, or search uploaded docs..."
              className="max-h-32 flex-1 resize-none bg-transparent px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none"
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

          <div className="mt-2 text-center text-[11px] text-slate-500 tracking-wide">
            Powered by <span className="font-semibold text-slate-400">Glow.ai</span>
          </div>
        </div>
      </div>
    </div>
  );
}

