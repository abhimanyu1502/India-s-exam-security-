/**
 * AlertPanel — Real-time alert feed + risk gauge
 */

import React from 'react';

const ALERT_ICONS = {
  face_absent: '👤',
  multiple_faces: '👥',
  phone_detected: '📱',
  looking_away: '👀',
  suspicious_object: '🔍',
  audio_anomaly: '🔊',
};

const ALERT_LABELS = {
  face_absent: 'Face Not Detected',
  multiple_faces: 'Multiple Faces',
  phone_detected: 'Phone Detected',
  looking_away: 'Looking Away',
  suspicious_object: 'Suspicious Object',
  audio_anomaly: 'Audio Anomaly',
};

const SEVERITY_CLASS = {
  face_absent: 'severity-critical',
  multiple_faces: 'severity-critical',
  phone_detected: 'severity-critical',
  looking_away: 'severity-medium',
  suspicious_object: 'severity-high',
  audio_anomaly: 'severity-low',
};

const getRiskColor = (score) => {
  if (score >= 0.8) return 'var(--accent-danger)';
  if (score >= 0.6) return '#f97316';
  if (score >= 0.3) return 'var(--accent-warning)';
  return 'var(--accent-success)';
};

const getRiskLabel = (score) => {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.6) return 'HIGH';
  if (score >= 0.3) return 'MEDIUM';
  return 'LOW';
};

const formatTime = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch { return '--'; }
};

const AlertPanel = ({ alerts, session, onViewReport }) => {
  const riskScore = session?.risk_score ?? 0;
  const riskColor = getRiskColor(riskScore);
  const riskLabel = getRiskLabel(riskScore);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* Risk Gauge */}
      {session && (
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="risk-gauge-container">
            <div className="risk-gauge-label">Risk Score</div>
            <div className="risk-score-display" style={{ color: riskColor }}>
              {(riskScore * 100).toFixed(0)}%
            </div>
            <div className="risk-bar-bg">
              <div
                className="risk-bar-fill"
                style={{
                  width: `${Math.min(100, riskScore * 100)}%`,
                  background: `linear-gradient(90deg, ${riskColor}, ${riskColor}dd)`,
                }}
              />
            </div>
            <div className={`risk-badge ${riskLabel}`}>{riskLabel} RISK</div>

            <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-400)' }}>
              {session.total_alerts} alerts · Session: <span className="font-mono" style={{ color: 'var(--accent-primary)' }}>{session.session_id}</span>
            </div>

            <button 
              className="btn btn-outline" 
              style={{ width: '100%', marginTop: 12, fontSize: '0.72rem', padding: '6px 12px', justifyContent: 'center' }}
              onClick={onViewReport}
              id="btn-view-report"
            >
              📄 View Audit Report
            </button>
          </div>
        </div>
      )}

      {/* Alert Feed */}
      <div className="panel-content" style={{ flex: 1 }}>
        {alerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🟢</div>
            <div className="empty-text">No alerts detected</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-400)' }}>
              Start video analysis to monitor
            </div>
          </div>
        ) : (
          [...alerts].reverse().map((alert, i) => (
            <div
              key={alert.id || `${alert.alert_type}-${i}`}
              className={`alert-item ${SEVERITY_CLASS[alert.alert_type] || 'severity-medium'}`}
            >
              <div className="alert-icon">
                {ALERT_ICONS[alert.alert_type] || '⚠️'}
              </div>
              <div className="alert-body">
                <div className="alert-type">
                  {ALERT_LABELS[alert.alert_type] || alert.alert_type}
                </div>
                <div className="alert-meta">
                  <span>{formatTime(alert.timestamp)}</span>
                  {alert.frame_number && (
                    <span className="font-mono">f#{alert.frame_number}</span>
                  )}
                  <span className="alert-confidence">
                    {((alert.confidence ?? 0) * 100).toFixed(0)}% conf
                  </span>
                  {alert.offline_cached && (
                    <span className="alert-offline-tag">📶 cached</span>
                  )}
                </div>
                {alert.block_hash && (
                  <div className="font-mono" style={{ fontSize: '0.6rem', color: 'var(--text-400)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ⛓ {alert.block_hash.substring(0, 20)}...
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
