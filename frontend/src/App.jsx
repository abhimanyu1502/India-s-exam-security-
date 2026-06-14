/**
 * ExamGuard Pro — Main App
 * =========================
 * Orchestrates all panels, manages shared state,
 * handles offline sync UI.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard.jsx';
import VideoAnalyzer from './components/VideoAnalyzer.jsx';
import AlertPanel from './components/AlertPanel.jsx';
import BlockchainLog from './components/BlockchainLog.jsx';
import StatusBar from './components/StatusBar.jsx';
import ReportModal from './components/ReportModal.jsx';
import { useOfflineSync } from './hooks/useOfflineSync.js';
import { listSessions, getSessionAlerts, getBlockchainStats } from './services/api.js';

const App = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [blockchainStats, setBlockchainStats] = useState(null);
  const [rightTab, setRightTab] = useState('alerts'); // 'alerts' | 'chain'
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const { isOnline, pendingCount, isSyncing, lastSyncResult, refreshPendingCount } = useOfflineSync();

  // ── Load sessions ──────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (err) {
      console.warn('[App] Could not load sessions (backend offline?)');
    }
  }, []);

  // ── Load alerts for active session ─────────────────────────────────────
  const loadAlerts = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      const data = await getSessionAlerts(sessionId);
      setAlerts(data);
    } catch (err) {
      console.warn('[App] Could not load alerts');
    }
  }, []);

  // ── Load blockchain stats ──────────────────────────────────────────────
  const loadBlockchainStats = useCallback(async () => {
    try {
      const data = await getBlockchainStats();
      setBlockchainStats(data);
    } catch (_) {}
  }, []);

  // Initial data load
  useEffect(() => {
    loadSessions();
    loadBlockchainStats();
  }, [loadSessions, loadBlockchainStats]);

  // Polling refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadSessions();
      if (activeSession) loadAlerts(activeSession.session_id);
      loadBlockchainStats();
    }, 8000);
    return () => clearInterval(interval);
  }, [activeSession, loadSessions, loadAlerts, loadBlockchainStats]);

  // Refresh after sync
  useEffect(() => {
    if (lastSyncResult?.success) {
      loadSessions();
      if (activeSession) loadAlerts(activeSession.session_id);
      loadBlockchainStats();
      refreshPendingCount();
    }
  }, [lastSyncResult]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleSelectSession = useCallback((session) => {
    setActiveSession(session);
    loadAlerts(session.session_id);
  }, [loadAlerts]);

  const handleSessionCreated = useCallback((session) => {
    setSessions(prev => [session, ...prev]);
    setActiveSession(session);
    setAlerts([]);
  }, []);

  const handleNewAlert = useCallback((alertPayload) => {
    // Optimistic local update while API is being called
    const localAlert = {
      id: `local-${Date.now()}`,
      ...alertPayload,
      timestamp: new Date().toISOString(),
      block_hash: null,
      synced: isOnline,
      offline_cached: !isOnline,
    };
    setAlerts(prev => [...prev, localAlert]);
    setRightTab('alerts');

    // Refresh session risk after a short delay
    setTimeout(() => {
      if (activeSession) {
        loadSessions();
        // Update active session's data
        setSessions(prev => prev.map(s =>
          s.session_id === alertPayload.session_id
            ? { ...s, total_alerts: (s.total_alerts || 0) + 1 }
            : s
        ));
      }
    }, 1500);
  }, [isOnline, activeSession, loadSessions]);

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <StatusBar
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingCount={pendingCount}
        blockchainStats={blockchainStats}
        onNewSession={() => setShowNewSessionModal(true)}
      />

      {/* Main 3-column layout */}
      <div className="main-content">
        {/* LEFT: Session list */}
        <Dashboard
          sessions={sessions}
          activeSessionId={activeSession?.session_id}
          onSelectSession={handleSelectSession}
          onSessionCreated={handleSessionCreated}
          showModal={showNewSessionModal}
          setShowModal={setShowNewSessionModal}
        />

        {/* CENTER: Video analysis */}
        <VideoAnalyzer
          session={activeSession}
          isOnline={isOnline}
          onAlert={handleNewAlert}
        />

        {/* RIGHT: Alerts + Chain tabs */}
        <div className="sidebar-right">
          <div className="panel-tabs">
            <button
              className={`panel-tab ${rightTab === 'alerts' ? 'active' : ''}`}
              id="tab-alerts"
              onClick={() => setRightTab('alerts')}
            >
              Alerts
              {alerts.length > 0 && (
                <span className="tab-count">{Math.min(99, alerts.length)}</span>
              )}
            </button>
            <button
              className={`panel-tab ${rightTab === 'chain' ? 'active' : ''}`}
              id="tab-chain"
              onClick={() => setRightTab('chain')}
            >
              ⛓ Chain
            </button>
          </div>

          {rightTab === 'alerts' ? (
            <AlertPanel 
              alerts={alerts} 
              session={activeSession} 
              onViewReport={() => setShowReportModal(true)}
            />
          ) : (
            <BlockchainLog sessionId={activeSession?.session_id} />
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        sessionId={activeSession?.session_id}
      />

      {/* Offline / Sync banner */}
      {!isOnline && (
        <div className="offline-banner">
          <div className="icon">📡</div>
          <div className="text">
            <div className="title">Offline Mode — Store & Forward</div>
            <div className="subtitle">
              {pendingCount > 0
                ? `${pendingCount} alerts cached locally · Will sync when connected`
                : 'Alerts are being cached locally · Auto-sync on reconnect'}
            </div>
          </div>
        </div>
      )}

      {isSyncing && (
        <div className="offline-banner" style={{ borderColor: 'var(--accent-primary)' }}>
          <div className="icon">🔄</div>
          <div className="text">
            <div className="title" style={{ color: 'var(--accent-primary)' }}>
              Syncing {pendingCount} cached alerts...
            </div>
            <div className="subtitle">Writing to blockchain audit trail</div>
            <div className="sync-progress">
              <div className="sync-progress-bar" />
            </div>
          </div>
        </div>
      )}

      {lastSyncResult?.success && (
        <div className="offline-banner" style={{ borderColor: 'var(--accent-success)' }}>
          <div className="icon">✅</div>
          <div className="text">
            <div className="title" style={{ color: 'var(--accent-success)' }}>
              Sync Complete — {lastSyncResult.synced} alerts committed to blockchain
            </div>
            <div className="subtitle">Audit trail fully restored</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
