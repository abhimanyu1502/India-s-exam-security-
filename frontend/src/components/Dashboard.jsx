/**
 * Dashboard — Left sidebar with session list
 */

import React, { useState } from 'react';
import { createSession } from '../services/api';

const getRiskLabel = (score) => {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.6) return 'HIGH';
  if (score >= 0.3) return 'MEDIUM';
  return 'LOW';
};

const Dashboard = ({ sessions, activeSessionId, onSelectSession, onSessionCreated, showModal, setShowModal }) => {
  const [form, setForm] = useState({ studentId: '', studentName: '', examName: '' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.studentName || !form.examName) return;

    setCreating(true);
    try {
      const session = await createSession(form.studentId, form.studentName, form.examName);
      onSessionCreated?.(session);
      setShowModal(false);
      setForm({ studentId: '', studentName: '', examName: '' });
    } catch (err) {
      alert('Failed to create session. Is the backend running?');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <aside className="sidebar-left">
        <button className="btn-new-session" id="btn-new-session-sidebar" onClick={() => setShowModal(true)}>
          + New Exam Session
        </button>

        <div className="sidebar-section-label">Active Sessions</div>

        {sessions.filter(s => s.status === 'active' || s.status === 'flagged').length === 0 && (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <div className="empty-icon">📋</div>
            <div className="empty-text">No active sessions</div>
          </div>
        )}

        {sessions
          .filter(s => s.status === 'active' || s.status === 'flagged')
          .map(session => (
            <div
              key={session.session_id}
              className={`session-card ${session.session_id === activeSessionId ? 'active' : ''} ${session.status === 'flagged' ? 'flagged' : ''}`}
              onClick={() => onSelectSession(session)}
            >
              <div className="session-name">{session.student_name}</div>
              <div className="session-meta">{session.exam_name}</div>
              <div className="session-meta" style={{ marginTop: 2 }}>
                <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--accent-primary)' }}>
                  {session.session_id}
                </span>
              </div>
              <div className={`risk-badge ${getRiskLabel(session.risk_score)}`}>
                {getRiskLabel(session.risk_score)}
              </div>
              {session.total_alerts > 0 && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-400)', marginTop: 4 }}>
                  {session.total_alerts} alert{session.total_alerts !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))}

        <div className="sidebar-section-label">Completed</div>

        {sessions
          .filter(s => s.status === 'completed')
          .slice(0, 5)
          .map(session => (
            <div
              key={session.session_id}
              className={`session-card ${session.session_id === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(session)}
              style={{ opacity: 0.7 }}
            >
              <div className="session-name">{session.student_name}</div>
              <div className="session-meta">{session.exam_name}</div>
              <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
                <div className={`risk-badge ${getRiskLabel(session.risk_score)}`}>
                  {getRiskLabel(session.risk_score)}
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-400)', marginTop: 1 }}>✓ Done</span>
              </div>
            </div>
          ))}

        {/* Feature badges */}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          {[
            { icon: '🤖', label: 'MediaPipe AI' },
            { icon: '⛓️', label: 'Merkle Blockchain' },
            { icon: '📡', label: 'Store & Forward' },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem', color: 'var(--text-400)',
            }}>
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* New Session Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">🎓 New Exam Session</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Student ID</label>
                <input
                  className="form-input"
                  id="input-student-id"
                  placeholder="e.g. STU-2024-001"
                  value={form.studentId}
                  onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Student Name</label>
                <input
                  className="form-input"
                  id="input-student-name"
                  placeholder="e.g. Ravi Kumar"
                  value={form.studentName}
                  onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Exam Name</label>
                <input
                  className="form-input"
                  id="input-exam-name"
                  placeholder="e.g. JEE Advanced Mock - Paper 1"
                  value={form.examName}
                  onChange={e => setForm(f => ({ ...f, examName: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={creating}>
                  {creating ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Creating...</> : 'Start Session'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
