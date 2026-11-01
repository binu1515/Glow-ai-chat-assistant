import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Settings,
  BarChart3,
  Database,
  FileText,
  Check,
  X,
  Bot,
} from 'lucide-react';

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onUpdateSession,
  onOpenSettings,
  onOpenAnalytics,
  onOpenCache,
  onOpenDocuments,
  isOpen,
  onToggle,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const startRename = (session, e) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveRename = async (id, e) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      await onUpdateSession(id, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const cancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-200 md:static md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Glow AI</h1>
            <div className="flex items-center space-x-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] font-medium text-slate-400">MCP Protocol 2.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onCreateSession}
          className="flex w-full items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-500 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Chat History
        </div>

        {sessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No active conversations. Start a new chat above!
          </div>
        ) : (
          sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            const isEditing = editingId === sess.id;

            return (
              <div
                key={sess.id}
                onClick={() => onSelectSession(sess.id)}
                className={`group relative flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition ${
                  isActive
                    ? 'bg-slate-800/90 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-36 rounded bg-slate-950 px-1.5 py-0.5 text-xs text-white border border-blue-500 outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{sess.title}</span>
                  )}
                </div>

                {/* Action buttons (Rename, Delete) */}
                <div className="flex items-center space-x-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={(e) => saveRename(sess.id, e)}
                        className="rounded p-1 text-emerald-400 hover:bg-slate-700"
                        title="Save"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={cancelRename}
                        className="rounded p-1 text-slate-400 hover:bg-slate-700"
                        title="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRename(sess, e)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                        title="Rename"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(sess.id);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-rose-900/60 hover:text-rose-300"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Modals Navigation */}
      <div className="border-t border-slate-800 p-3 space-y-1 bg-slate-950/80">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center space-x-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <Settings className="h-4 w-4 text-slate-400" />
          <span>Model Settings</span>
        </button>

        <button
          onClick={onOpenAnalytics}
          className="flex w-full items-center space-x-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          <span>Token Usage Dashboard</span>
        </button>

        <button
          onClick={onOpenCache}
          className="flex w-full items-center space-x-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <Database className="h-4 w-4 text-cyan-400" />
          <span>Redis Cache Monitor</span>
        </button>

        <button
          onClick={onOpenDocuments}
          className="flex w-full items-center space-x-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <FileText className="h-4 w-4 text-indigo-400" />
          <span>Document Management</span>
        </button>
      </div>
    </aside>
  );
}

