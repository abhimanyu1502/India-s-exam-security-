/**
 * BlockchainLog — Live blockchain block visualization
 */

import React, { useState, useEffect } from 'react';
import { getBlockchainStats, getFullChain, tamperChain } from '../services/api';

const BlockchainLog = ({ sessionId }) => {
  const [stats, setStats] = useState(null);
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(null);

  const loadChain = async () => {
    try {
      const [statsData, chainData] = await Promise.all([
        getBlockchainStats(),
        getFullChain(),
      ]);
      setStats(statsData);
      setChain(chainData.chain || []);
      setVerified(statsData.chain_valid);
    } catch (err) {
      console.error('[BlockchainLog] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTamper = async (index) => {
    if (!window.confirm(`Are you sure you want to corrupt Block #${index}? This simulates database tampering/intrusion to test Merkle integrity.`)) return;
    try {
      const res = await tamperChain(index);
      if (res.status === 'success') {
        alert(res.message);
        loadChain();
      } else {
        alert('Failed to tamper: ' + res.message);
      }
    } catch (err) {
      alert('Error tampering: ' + err.message);
    }
  };

  useEffect(() => {
    loadChain();
    const interval = setInterval(loadChain, 5000);
    return () => clearInterval(interval);
  }, []);

  const truncateHash = (hash) => hash ? `${hash.substring(0, 8)}...${hash.substring(56)}` : '--';

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" />
        <div className="empty-text">Loading chain...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* Chain Stats */}
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{
          background: verified ? 'var(--accent-success-glow)' : 'var(--accent-danger-glow)',
          border: `1px solid ${verified ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: '1rem' }}>{verified ? '✅' : '❌'}</span>
            <span style={{
              fontSize: '0.78rem', fontWeight: 700,
              color: verified ? 'var(--accent-success)' : 'var(--accent-danger)',
            }}>
              {verified ? 'CHAIN INTEGRITY VERIFIED' : 'CHAIN INTEGRITY FAILED'}
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-400)' }}>
            {stats?.verification_message}
          </div>
        </div>

        {/* Mini stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Blocks', value: stats?.total_blocks ?? 0 },
            { label: 'Events', value: stats?.total_events ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'var(--bg-700)', borderRadius: 'var(--radius-sm)',
              padding: '8px 10px', border: '1px solid var(--border-subtle)',
            }}>
              <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {value}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Event breakdown */}
        {stats?.event_breakdown && Object.keys(stats.event_breakdown).length > 0 && (
          <div style={{ marginTop: 8 }}>
            {Object.entries(stats.event_breakdown).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '0.72rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-300)' }}>{type.replace(/_/g, ' ')}</span>
                <span className="font-mono" style={{ color: 'var(--accent-warning)' }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block list */}
      <div className="panel-content">
        {[...chain].reverse().map((block, i, arr) => (
          <React.Fragment key={block.index}>
            <div className="chain-block">
              <div className="block-header">
                <span className="block-index">
                  {block.index === 0 ? '⛓ GENESIS' : `#${block.index}`}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {block.index > 0 && (
                    <button
                      className="btn-tamper-block"
                      onClick={() => handleTamper(block.index)}
                      title="Simulate data tampering on this block"
                    >
                      😈 Tamper
                    </button>
                  )}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-400)' }}>
                    {new Date(block.timestamp).toLocaleTimeString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Transaction summary */}
              {block.transactions.length > 0 && (
                <div style={{
                  background: 'var(--bg-800)', borderRadius: 'var(--radius-sm)',
                  padding: '6px 8px', marginBottom: 6, fontSize: '0.72rem',
                }}>
                  {block.transactions.map((tx, ti) => (
                    <div key={ti} style={{ color: 'var(--text-200)' }}>
                      <span style={{ color: 'var(--accent-warning)' }}>
                        {tx.event_type?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {' · '}
                      <span style={{ color: 'var(--text-400)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                        {tx.student_id}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {block.index === 0 && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-400)', marginBottom: 4 }}>
                  Genesis Block — Chain Origin
                </div>
              )}

              <div style={{ display: 'grid', gap: 2 }}>
                <div style={{ display: 'flex', gap: 6, fontSize: '0.62rem' }}>
                  <span style={{ color: 'var(--text-400)', minWidth: 60 }}>Hash:</span>
                  <span className="font-mono" style={{ color: 'var(--accent-secondary)', wordBreak: 'break-all' }}>
                    {truncateHash(block.hash)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: '0.62rem' }}>
                  <span style={{ color: 'var(--text-400)', minWidth: 60 }}>Prev:</span>
                  <span className="font-mono" style={{ color: 'var(--text-400)', wordBreak: 'break-all' }}>
                    {truncateHash(block.previous_hash)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: '0.62rem' }}>
                  <span style={{ color: 'var(--text-400)', minWidth: 60 }}>Merkle:</span>
                  <span className="font-mono" style={{ color: 'var(--accent-purple)', wordBreak: 'break-all' }}>
                    {truncateHash(block.merkle_root)}
                  </span>
                </div>
              </div>
            </div>
            {i < arr.length - 1 && <div className="chain-connector">↑</div>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default BlockchainLog;
