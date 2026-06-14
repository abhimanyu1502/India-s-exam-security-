/**
 * useMediaPipe — React hook for video analysis
 * ==============================================
 * Manages MediaPipe lifecycle, video frame processing,
 * and alert dispatch (online → API, offline → IndexedDB).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { initMediaPipe, analyzeFrame, drawOverlay, isMediaPipeReady } from '../services/mediapipe';
import { logAlert, bulkSyncAlerts } from '../services/api';
import { cacheAlert, getPendingAlerts, clearAllPending } from '../services/offlineQueue';

const ANALYSIS_INTERVAL_MS = 500;   // analyze every 500ms = 2fps analysis
const COOLDOWN_MS = 3000;           // same alert type won't fire again for 3s

export const useMediaPipe = ({ sessionId, studentId, isOnline, onAlert }) => {
  const [mpStatus, setMpStatus] = useState('idle'); // idle|loading|ready|error
  const [mpMessage, setMpMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastAlertTimes = useRef({});  // cooldown tracker per alert type
  const rafRef = useRef(null);        // requestAnimationFrame for overlay

  // Load MediaPipe models
  const loadModels = useCallback(async () => {
    if (isMediaPipeReady()) { setMpStatus('ready'); return; }
    setMpStatus('loading');
    try {
      await initMediaPipe((msg) => setMpMessage(msg));
      setMpStatus('ready');
      setMpMessage('');
    } catch (err) {
      setMpStatus('error');
      setMpMessage('Failed to load AI models. Check internet connection.');
    }
  }, []);

  // Dispatch alert: online → API, offline → IndexedDB
  const dispatchAlert = useCallback(async (anomaly) => {
    if (!sessionId) return;

    const now = Date.now();
    const lastTime = lastAlertTimes.current[anomaly.type] || 0;
    if (now - lastTime < COOLDOWN_MS) return;  // cooldown active
    lastAlertTimes.current[anomaly.type] = now;

    const payload = {
      session_id: sessionId,
      student_id: studentId || 'UNKNOWN',
      alert_type: anomaly.type,
      confidence: anomaly.confidence,
      frame_number: anomaly.details?.frame ?? frameCountRef.current,
      metadata: anomaly.details || {},
    };

    onAlert?.(payload);  // Notify UI immediately

    if (isOnline) {
      try {
        await logAlert(payload);
      } catch (err) {
        console.warn('[MediaPipe] API failed, caching offline:', err.message);
        await cacheAlert(payload);
      }
    } else {
      await cacheAlert(payload);
    }
  }, [sessionId, studentId, isOnline, onAlert]);

  // Start analysis loop
  const startAnalysis = useCallback(() => {
    if (isAnalyzing) return;
    if (mpStatus !== 'ready') { loadModels(); return; }

    setIsAnalyzing(true);
    frameCountRef.current = 0;

    // Analysis interval
    intervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.ended) return;

      frameCountRef.current += 1;
      const anomalies = analyzeFrame(video, frameCountRef.current);
      anomalies.forEach(dispatchAlert);
    }, ANALYSIS_INTERVAL_MS);

    // Canvas overlay loop
    const drawLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && !video.paused) {
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        drawOverlay(ctx, video);
      }
      rafRef.current = requestAnimationFrame(drawLoop);
    };
    rafRef.current = requestAnimationFrame(drawLoop);
  }, [isAnalyzing, mpStatus, loadModels, dispatchAlert]);

  // Stop analysis loop
  const stopAnalysis = useCallback(() => {
    clearInterval(intervalRef.current);
    cancelAnimationFrame(rafRef.current);
    setIsAnalyzing(false);
    frameCountRef.current = 0;
    lastAlertTimes.current = {};
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    mpStatus,
    mpMessage,
    isAnalyzing,
    loadModels,
    startAnalysis,
    stopAnalysis,
    frameCount: frameCountRef.current,
  };
};
