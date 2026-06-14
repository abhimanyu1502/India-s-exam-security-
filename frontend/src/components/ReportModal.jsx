/**
 * ReportModal — Cryptographic Audit Report Modal
 */

import React, { useState, useEffect } from 'react';
import { getSessionReport } from '../services/api';

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

const ReportModal = ({ isOpen, onClose, sessionId }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSessionReport(sessionId);
        setReport(data);
      } catch (err) {
        console.error('[ReportModal] Error fetching report:', err);
        setError('Failed to load integrity report. Verify backend connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="report-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.4rem' }}>📄</span>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Integrity Audit Report</h3>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-400)', marginTop: 1 }}>
                Cryptographic Merkle Proof · ExamGuard Pro
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-300)',
              fontSize: '1.2rem', cursor: 'pointer', padding: 4
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="report-body">
          {loading ? (
            <div className="empty-state">
              <div className="spinner" />
              <div className="empty-text">Generating cryptographic report...</div>
            </div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ color: 'var(--accent-danger)' }}>⚠️</div>
              <div className="empty-text">{error}</div>
            </div>
          ) : report ? (
            <>
              {/* Info Grid */}
              <div className="report-grid">
                <div className="report-field">
                  <span className="report-field-label">Student Name</span>
                  <span className="report-field-value">{report.session.student_name}</span>
                </div>
                <div className="report-field">
                  <span className="report-field-label">Student ID</span>
                  <span className="report-field-value font-mono">{report.session.student_id}</span>
                </div>
                <div className="report-field">
                  <span className="report-field-label">Exam Name</span>
                  <span className="report-field-value">{report.session.exam_name}</span>
                </div>
                <div className="report-field">
                  <span className="report-field-label">Session Reference</span>
                  <span className="report-field-value font-mono" style={{ color: 'var(--accent-primary)' }}>
                    {report.session.session_id}
                  </span>
                </div>
              </div>

              {/* Status Box */}
              <div className={`report-status-box ${report.chain_integrity ? 'verified' : 'tampered'}`}>
                <div className="report-status-title" style={{ color: report.chain_integrity ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  <span>{report.chain_integrity ? '🛡️ SECURE CHAIN VERIFIED' : '🚨 CORRUPT LOG DETECTED'}</span>
                </div>
                <div className="report-status-desc">
                  {report.chain_integrity 
                    ? `This report is cryptographically sealed. The SHA-256 Merkle chain has been validated, proving that the audit log has not been altered or deleted since the exam started.` 
                    : `CRITICAL SECURITY ALERT: The SHA-256 Merkle root hash or blockchain linkages did not match the logged database values. Audit trail data has been tampered with or deleted.`}
                </div>
              </div>

              {/* Risk Assessment */}
              <div style={{
                background: 'var(--bg-700)', padding: 16,
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
                display: 'flex', flexDirection: 'column', gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-300)' }}>
                    RISK ENGINE ASSESSMENT
                  </span>
                  <span 
                    style={{
                      fontSize: '0.75rem', fontWeight: 800,
                      color: getRiskColor(report.session.risk_score),
                    }}
                  >
                    {getRiskLabel(report.session.risk_score)} RISK ({(report.session.risk_score * 100).toFixed(0)}%)
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-100)', marginTop: 4 }}>
                  {report.risk_assessment}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-300)' }}>
                  <span style={{ fontWeight: 600 }}>Recommendation:</span> {report.recommendation}
                </div>
              </div>

              {/* Merkle Audit Trail */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-300)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⛓️ Cryptographic Audit Trail ({report.blockchain_events.length} events)
                </h4>
                {report.blockchain_events.length === 0 ? (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-400)', padding: '12px', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    No anomaly events recorded in blockchain ledger.
                  </div>
                ) : (
                  <div className="report-table-container">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Block</th>
                          <th>Timestamp</th>
                          <th>Event Type</th>
                          <th>Confidence</th>
                          <th>SHA-256 Block Hash</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.blockchain_events.map((event) => (
                          <tr key={event.block_index}>
                            <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>
                              #{event.block_index}
                            </td>
                            <td style={{ color: 'var(--text-300)' }}>
                              {new Date(event.timestamp).toLocaleTimeString('en-IN')}
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--accent-warning)' }}>
                              {event.event_type?.replace(/_/g, ' ').toUpperCase()}
                            </td>
                            <td className="font-mono">
                              {((event.confidence ?? 0) * 100).toFixed(0)}%
                            </td>
                            <td className="font-mono" style={{ color: 'var(--text-400)', fontSize: '0.62rem' }}>
                              {event.block_hash.substring(0, 16)}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="report-footer">
          {report && (
            <button className="btn btn-primary" onClick={handlePrint}>
              🖨️ Print / Save PDF
            </button>
          )}
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
