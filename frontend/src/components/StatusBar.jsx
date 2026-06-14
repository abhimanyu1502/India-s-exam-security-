/**
 * StatusBar — Top navigation with live connection status
 */

import React from 'react';

const StatusBar = ({ isOnline, isSyncing, pendingCount, blockchainStats, onNewSession }) => {
  const getStatusInfo = () => {
    if (isSyncing) return { cls: 'syncing', dot: false, label: `Syncing ${pendingCount} alerts...` };
    if (!isOnline) return { cls: 'offline', dot: true, label: `Offline · ${pendingCount} queued` };
    return { cls: 'online', dot: true, label: 'Connected' };
  };

  const { cls, dot, label } = getStatusInfo();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="shield-icon">🛡️</div>
        <span>ExamGuard<span style={{ color: 'var(--accent-primary)' }}>Pro</span></span>
        <span style={{
          fontSize: '0.65rem',
          background: 'rgba(59,130,246,0.15)',
          color: 'var(--accent-primary)',
          padding: '2px 8px',
          borderRadius: '20px',
          fontWeight: 600,
          letterSpacing: '0.5px',
          marginLeft: 4
        }}>MVP</span>
      </div>

      <div className="navbar-status">
        {/* Blockchain stats */}
        {blockchainStats && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-400)' }}>
            <span>⛓️</span>
            <span className="font-mono">
              {blockchainStats.total_blocks} blocks
            </span>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: blockchainStats.chain_valid ? 'var(--accent-success)' : 'var(--accent-danger)',
            }} />
          </div>
        )}

        {/* Offline pending count */}
        {pendingCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: '0.72rem', color: 'var(--accent-warning)',
            background: 'rgba(245,158,11,0.1)', padding: '3px 8px',
            borderRadius: '20px', border: '1px solid rgba(245,158,11,0.2)'
          }}>
            💾 {pendingCount} cached
          </div>
        )}

        {/* Connection status */}
        <div className={`status-pill ${cls}`}>
          {isSyncing ? (
            <div className="spinner" style={{ width: 10, height: 10 }} />
          ) : (
            <div className={`status-dot ${dot ? 'pulse' : ''}`} />
          )}
          {label}
        </div>

        {/* New Session button */}
        <button className="btn btn-primary" onClick={onNewSession} id="btn-new-session">
          + New Session
        </button>
      </div>
    </nav>
  );
};

export default StatusBar;
