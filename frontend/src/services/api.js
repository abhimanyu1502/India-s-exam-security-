/**
 * ExamGuard Pro - Backend API Service
 * =====================================
 * All REST calls to the FastAPI backend.
 * Handles offline detection and error wrapping.
 */

import axios from 'axios';

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Sessions ─────────────────────────────────────────────────────────────

export const createSession = async (studentId, studentName, examName) => {
  const res = await api.post('/sessions', {
    student_id: studentId,
    student_name: studentName,
    exam_name: examName,
  });
  return res.data;
};

export const listSessions = async () => {
  const res = await api.get('/sessions');
  return res.data;
};

export const getSession = async (sessionId) => {
  const res = await api.get(`/sessions/${sessionId}`);
  return res.data;
};

export const endSession = async (sessionId) => {
  const res = await api.patch(`/sessions/${sessionId}/end`);
  return res.data;
};

// ─── Alerts ───────────────────────────────────────────────────────────────

export const logAlert = async (alertPayload) => {
  const res = await api.post('/alerts', alertPayload);
  return res.data;
};

export const bulkSyncAlerts = async (alerts) => {
  const res = await api.post('/alerts/bulk-sync', { alerts });
  return res.data;
};

export const getSessionAlerts = async (sessionId) => {
  const res = await api.get(`/alerts/${sessionId}`);
  return res.data;
};

export const getSessionReport = async (sessionId) => {
  const res = await api.get(`/alerts/report/${sessionId}`);
  return res.data;
};

// ─── Blockchain ───────────────────────────────────────────────────────────

export const getBlockchainStats = async () => {
  const res = await api.get('/blockchain/stats');
  return res.data;
};

export const getFullChain = async () => {
  const res = await api.get('/blockchain/chain');
  return res.data;
};

export const verifyChain = async () => {
  const res = await api.get('/blockchain/verify');
  return res.data;
};

export const getSessionChain = async (sessionId) => {
  const res = await api.get(`/blockchain/session/${sessionId}`);
  return res.data;
};

export const tamperChain = async (blockIndex) => {
  const res = await api.post(`/blockchain/tamper/${blockIndex}`);
  return res.data;
};

// ─── Health ───────────────────────────────────────────────────────────────

export const checkHealth = async () => {
  try {
    const res = await api.get('/health', { timeout: 3000 });
    return { online: true, data: res.data };
  } catch {
    return { online: false };
  }
};

export default api;
