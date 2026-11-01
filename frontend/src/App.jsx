import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import TokenDashboard from './components/TokenDashboard';
import CacheManager from './components/CacheManager';
import DocumentUploader from './components/DocumentUploader';
import { useTheme } from './context/ThemeContext';
import {
  fetchSessions,
  createSession,
  fetchSessionDetails,
  deleteSession,
  updateSession,
  fetchConfig,
} from './services/api';

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [configData, setConfigData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal Open/Close States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isCacheOpen, setIsCacheOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [sessionsList, cfg] = await Promise.all([
        fetchSessions().catch(() => []),
        fetchConfig().catch(() => null),
      ]);

      setSessions(sessionsList);
      setConfigData(cfg);

      if (sessionsList.length > 0) {
        selectSession(sessionsList[0].id);
      } else {
        // Create an initial default session
        handleCreateSession();
      }
    } catch (err) {
      console.error('Initialization error:', err);
    }
  };

  const selectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    try {
      const details = await fetchSessionDetails(sessionId);
      setCurrentSession(details);
    } catch (err) {
      console.error(`Failed to load session ${sessionId}:`, err);
    }
  };

  const handleCreateSession = async () => {
    try {
      const prov = configData?.active_config?.provider || 'gemini';
      const mod = configData?.active_config?.model || 'gemini-1.5-flash';
      const newSess = await createSession('New Conversation', prov, mod);
      setSessions((prev) => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      setCurrentSession({ ...newSess, messages: [] });
    } catch (err) {
      console.error('Error creating session:', err);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteSession(sessionId);
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);
      if (activeSessionId === sessionId) {
        if (remaining.length > 0) {
          selectSession(remaining[0].id);
        } else {
          handleCreateSession();
        }
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const handleUpdateSession = async (sessionId, updates) => {
    try {
      const updated = await updateSession(sessionId, updates);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, ...updated } : s)));
      if (currentSession?.id === sessionId) {
        setCurrentSession((prev) => ({ ...prev, ...updated }));
      }
    } catch (err) {
      console.error('Error updating session:', err);
    }
  };

  const handleSessionUpdated = async (sessionId) => {
    try {
      const updatedList = await fetchSessions();
      setSessions(updatedList);
      if (sessionId) {
        const details = await fetchSessionDetails(sessionId);
        setCurrentSession(details);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const { isDark } = useTheme();

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-150 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          selectSession(id);
          setIsSidebarOpen(false);
        }}
        onCreateSession={() => {
          handleCreateSession();
          setIsSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        onUpdateSession={handleUpdateSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenCache={() => setIsCacheOpen(true)}
        onOpenDocuments={() => setIsDocsOpen(true)}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Chat Interface */}
      <ChatInterface
        session={currentSession}
        configData={configData}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenCache={() => setIsCacheOpen(true)}
        onOpenDocuments={() => setIsDocsOpen(true)}
        onSessionUpdated={handleSessionUpdated}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        configData={configData}
        onConfigUpdated={(newCfg) => setConfigData(newCfg)}
      />

      <TokenDashboard
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />

      <CacheManager
        isOpen={isCacheOpen}
        onClose={() => setIsCacheOpen(false)}
      />

      <DocumentUploader
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />
    </div>
  );
}
