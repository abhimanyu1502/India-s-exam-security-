/**
 * VideoAnalyzer — Core AI analysis panel
 * ========================================
 * Video upload, MediaPipe processing, detection indicator grid.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useMediaPipe } from '../hooks/useMediaPipe';

const DETECTIONS = [
  { key: 'face_absent', icon: '👤', label: 'Face Absent' },
  { key: 'multiple_faces', icon: '👥', label: 'Multi-Face' },
  { key: 'phone_detected', icon: '📱', label: 'Phone' },
  { key: 'looking_away', icon: '👀', label: 'Away' },
];

const VideoAnalyzer = ({ session, isOnline, onAlert, onStatsUpdate }) => {
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoName, setVideoName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeDetections, setActiveDetections] = useState({});
  const [alertCount, setAlertCount] = useState(0);
  const [elapsedFrames, setElapsedFrames] = useState(0);
  const fileInputRef = useRef(null);
  const detectionTimeouts = useRef({});

  const [isWebcam, setIsWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);

  const handleAlert = useCallback((alertPayload) => {
    // Trigger UI flash for this detection type
    const type = alertPayload.alert_type;
    setActiveDetections(prev => ({ ...prev, [type]: true }));
    setAlertCount(c => c + 1);

    // Clear flash after 2s
    clearTimeout(detectionTimeouts.current[type]);
    detectionTimeouts.current[type] = setTimeout(() => {
      setActiveDetections(prev => ({ ...prev, [type]: false }));
    }, 2000);

    onAlert?.(alertPayload);
  }, [onAlert]);

  const { videoRef, canvasRef, mpStatus, mpMessage, isAnalyzing, loadModels, startAnalysis, stopAnalysis } =
    useMediaPipe({
      sessionId: session?.session_id,
      studentId: session?.student_id,
      isOnline,
      onAlert: handleAlert,
    });

  const startWebcam = async () => {
    try {
      stopAnalysis();
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      setWebcamStream(stream);
      setVideoSrc('webcam');
      setVideoName('Live Webcam Stream');
      setAlertCount(0);
      setActiveDetections({});
    } catch (err) {
      alert('Error accessing camera: ' + err.message);
      setIsWebcam(false);
    }
  };

  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setVideoSrc(null);
    setVideoName('');
  }, [webcamStream]);

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamStream]);

  useEffect(() => {
    if (isWebcam && webcamStream && videoRef.current) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch(err => console.warn("Video play interrupted:", err));
    }
  }, [isWebcam, webcamStream, videoRef]);

  // Frame counter sync
  const videoEl = videoRef.current;
  if (videoEl && !videoEl.paused) {
    const current = Math.floor(videoEl.currentTime * 30);
    if (current !== elapsedFrames) setElapsedFrames(current);
  }

  const handleFile = (file) => {
    if (!file?.type.startsWith('video/')) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoName(file.name);
    setAlertCount(0);
    setActiveDetections({});
    stopAnalysis();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleVideoEnd = () => {
    stopAnalysis();
  };

  return (
    <div className="video-panel">
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>
            🎥 AI Video Analysis
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-400)', marginTop: 2 }}>
            {session
              ? `Session: ${session.session_id} · ${session.student_name}`
              : 'Create or select a session to begin'}
          </p>
        </div>
        {/* MediaPipe Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '0.72rem', padding: '4px 10px',
          borderRadius: '20px',
          background: mpStatus === 'ready' ? 'var(--accent-success-glow)' :
            mpStatus === 'loading' ? 'rgba(59,130,246,0.1)' :
              mpStatus === 'error' ? 'var(--accent-danger-glow)' : 'var(--bg-600)',
          border: `1px solid ${mpStatus === 'ready' ? 'rgba(16,185,129,0.3)' :
            mpStatus === 'error' ? 'rgba(239,68,68,0.3)' : 'var(--border-default)'}`,
        }}>
          {mpStatus === 'loading' && <div className="spinner" style={{ width: 10, height: 10 }} />}
          <span style={{
            color: mpStatus === 'ready' ? 'var(--accent-success)' :
              mpStatus === 'error' ? 'var(--accent-danger)' : 'var(--text-400)'
          }}>
            MediaPipe {mpStatus === 'idle' ? 'Not Loaded' : mpStatus === 'loading' ? mpMessage || 'Loading...' :
              mpStatus === 'ready' ? '✓ Ready' : '✗ Error'}
          </span>
        </div>
      </div>

      {/* Mode selection tabs */}
      <div className="analyzer-tabs">
        <button
          className={`analyzer-tab-btn ${!isWebcam ? 'active' : ''}`}
          onClick={() => {
            setIsWebcam(false);
            stopWebcam();
            stopAnalysis();
          }}
        >
          📁 Upload Video File
        </button>
        <button
          className={`analyzer-tab-btn ${isWebcam ? 'active' : ''}`}
          onClick={() => {
            setIsWebcam(true);
            stopAnalysis();
            startWebcam();
          }}
        >
          🎥 Live Web Camera
        </button>
      </div>

      {/* Video area */}
      {isWebcam ? (
        !videoSrc ? (
          <div
            className="upload-zone"
            onClick={startWebcam}
          >
            <div className="upload-icon">🎥</div>
            <div className="upload-title">Camera is Offline</div>
            <div className="upload-hint">
              Click here to request permission and start the live web camera
            </div>
          </div>
        ) : (
          <div className="video-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <canvas ref={canvasRef} className="video-overlay-canvas" />
          </div>
        )
      ) : (
        !videoSrc ? (
          <div
            className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">🎬</div>
            <div className="upload-title">Drop exam video here</div>
            <div className="upload-hint">
              Pre-recorded MP4/WebM of student taking exam<br />
              <span style={{ color: 'var(--accent-primary)' }}>For demo: record 30s of someone holding a phone</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="video-container">
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              onEnded={handleVideoEnd}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <canvas ref={canvasRef} className="video-overlay-canvas" />
          </div>
        )
      )}

      {/* Controls */}
      {videoSrc && (
        <div className="video-controls">
          {!isAnalyzing ? (
            <button
              className="btn btn-primary"
              id="btn-start-analysis"
              onClick={() => {
                if (!session) { alert('Please create a session first!'); return; }
                loadModels();
                setTimeout(startAnalysis, 500);
              }}
              disabled={!session}
            >
              ▶ Start AI Analysis
            </button>
          ) : (
            <button className="btn btn-danger" id="btn-stop-analysis" onClick={stopAnalysis}>
              ⏹ Stop Analysis
            </button>
          )}

          <button
            className="btn btn-outline"
            onClick={() => {
              if (isWebcam) {
                stopWebcam();
              } else {
                setVideoSrc(null);
              }
              stopAnalysis();
            }}
          >
            {isWebcam ? '⏹ Turn Off Camera' : '🔄 Change Video'}
          </button>

          {videoName && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-400)', marginLeft: 'auto' }}>
              📁 {videoName}
            </span>
          )}
        </div>
      )}

      {/* Detection Indicators */}
      <div className="detection-grid">
        {DETECTIONS.map(({ key, icon, label }) => (
          <div
            key={key}
            className={`detection-indicator ${activeDetections[key] ? 'active' : ''}`}
          >
            <div className="det-icon">{icon}</div>
            <div className="det-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
            {alertCount}
          </div>
          <div className="stat-label">Alerts Raised</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-secondary)' }}>
            {elapsedFrames}
          </div>
          <div className="stat-label">Frames Processed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: isAnalyzing ? 'var(--accent-success)' : 'var(--text-400)' }}>
            {isAnalyzing ? 'ON' : 'OFF'}
          </div>
          <div className="stat-label">AI Detection</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{
            color: isOnline ? 'var(--accent-success)' : 'var(--accent-warning)',
            fontSize: '1.1rem',
          }}>
            {isOnline ? '🌐 Live' : '💾 Cache'}
          </div>
          <div className="stat-label">Alert Mode</div>
        </div>
      </div>

      {/* Hackathon Demo Simulator */}
      {session && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.05)',
          border: '1px dashed var(--accent-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              🛠️ Hackathon Demo Simulator
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-400)' }}>
              Simulate anomalies for live verification testing
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { type: 'face_absent', label: '👤 Absent', confidence: 0.95 },
              { type: 'multiple_faces', label: '👥 Multi-Face', confidence: 0.98 },
              { type: 'phone_detected', label: '📱 Phone', confidence: 0.85 },
              { type: 'looking_away', label: '👀 Away', confidence: 0.78 },
            ].map(({ type, label, confidence }) => (
              <button
                key={type}
                className="btn btn-outline"
                style={{ fontSize: '0.7rem', padding: '6px 8px', justifyContent: 'center' }}
                onClick={() => {
                  const mockPayload = {
                    session_id: session.session_id,
                    student_id: session.student_id,
                    alert_type: type,
                    confidence: confidence,
                    frame_number: elapsedFrames || 42,
                    metadata: { simulated: true, injected_at: new Date().toISOString() }
                  };
                  handleAlert(mockPayload);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Offline explanation */}
      {!isOnline && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '0.8rem',
        }}>
          <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>📡 Store & Forward Active</span>
          <p style={{ color: 'var(--text-300)', marginTop: 4, lineHeight: 1.5 }}>
            Internet unavailable. All AI-detected alerts are being cached in IndexedDB and will automatically sync to the blockchain audit trail when connection is restored.
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoAnalyzer;
