# ExamGuard Pro — Build Summary & Continuation Guide
**Generated**: 2026-06-14 | **Status**: MVP Complete — Ready for Integration Testing

> This document is for AI agents continuing this project. Read it fully before making changes.

---

## 🏗️ What Was Built

A **Remote Exam Proctoring MVP** with three core systems:

| System | Technology | Status |
|--------|-----------|--------|
| AI Detection | MediaPipe tasks-vision (React/browser) | ✅ Built |
| Blockchain Audit | SHA-256 Merkle Tree (Python) | ✅ Built |
| Offline Fallback | IndexedDB Store-and-Forward | ✅ Built |
| Backend API | FastAPI + SQLite | ✅ Built |
| Frontend UI | React + Vite (premium dark theme) | ✅ Built |

---

## 📁 Complete File Tree

```
Far away hackathon prototype/
├── start_backend.bat         ← Run this first (Python/FastAPI)
├── start_frontend.bat        ← Run this second (React/Vite)
├── BUILD_SUMMARY.md          ← This file
│
├── backend/
│   ├── main.py               ← FastAPI app, port 8000
│   ├── blockchain.py         ← MockBlockchain class (Merkle Tree, SHA-256)
│   ├── database.py           ← SQLAlchemy models (ExamSession, Alert)
│   ├── models.py             ← Pydantic schemas + ALERT_SEVERITY weights
│   ├── requirements.txt      ← fastapi, uvicorn, sqlalchemy, aiosqlite
│   ├── data/                 ← chain.json auto-created here on first run
│   └── routes/
│       ├── __init__.py
│       ├── auth.py           ← /sessions CRUD
│       ├── alerts.py         ← /alerts POST + /alerts/bulk-sync (offline sync)
│       └── blockchain.py     ← /blockchain/chain, /verify, /stats
│
└── frontend/
    ├── index.html            ← Inter + JetBrains Mono fonts
    ├── package.json          ← react, @mediapipe/tasks-vision, idb, recharts, axios
    ├── vite.config.js        ← Port 5173, proxy /api → localhost:8000
    └── src/
        ├── main.jsx          ← React entry point
        ├── App.jsx           ← Root: 3-column layout, shared state, polling
        ├── index.css         ← Full design system (dark theme, animations)
        │
        ├── components/
        │   ├── StatusBar.jsx     ← Navbar: online/offline pill, blockchain stats
        │   ├── Dashboard.jsx     ← Left sidebar: session list + create modal
        │   ├── VideoAnalyzer.jsx ← Center: video upload + MediaPipe analysis
        │   ├── AlertPanel.jsx    ← Right: live alert feed + risk gauge
        │   └── BlockchainLog.jsx ← Right tab: block visualization + verify
        │
        ├── services/
        │   ├── api.js            ← Axios client (all backend calls)
        │   ├── mediapipe.js      ← FaceLandmarker + PoseLandmarker setup
        │   └── offlineQueue.js   ← IndexedDB CRUD (idb library)
        │
        └── hooks/
            ├── useMediaPipe.js   ← Analysis loop, alert dispatch, canvas overlay
            └── useOfflineSync.js ← Online/offline events, auto bulk-sync
```

---

## 🚀 How to Run

### Step 1: Start Backend
```powershell
# Open terminal 1
cd "Far away hackathon prototype"
.\start_backend.bat
# OR manually:
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Step 2: Start Frontend
```powershell
# Open terminal 2
cd "Far away hackathon prototype\frontend"
npm install
npm run dev
# Opens at http://localhost:5173
```

### Step 3: Demo Flow
1. Open http://localhost:5173
2. Click **+ New Exam Session** → fill student details
3. Drag-drop a video (MP4/WebM of someone holding a phone)
4. Click **▶ Start AI Analysis**
5. Watch alerts appear in right panel + blockchain blocks created
6. Check ⛓ Chain tab to see Merkle hash chain
7. To demo offline: disconnect internet → alerts queue in IndexedDB → reconnect → auto-sync

---

## 🧠 Key Architecture Decisions

### AI Detection Strategy
- **NOT using YOLOv8/webcam** → avoids CORS + browser crashes
- Using `@mediapipe/tasks-vision` which runs **entirely in-browser via WASM**
- Processes **pre-recorded video** frame by frame (500ms interval = 2fps analysis)
- Detection heuristics:
  - `face_absent`: no face landmarks detected
  - `multiple_faces`: >1 face detected
  - `looking_away`: nose tip x-offset > 0.2 from center
  - `phone_detected`: wrist above elbow + wrists close together (holding pose)

### Blockchain Strategy
- **NOT using real Ethereum/Ganache** → no environment setup needed
- Pure Python SHA-256 Merkle Tree → `blockchain.py`
- Append-only `data/chain.json` (immutable by design)
- Each alert = 1 block with: index, timestamp, prev_hash, merkle_root, hash
- `verify_chain()` endpoint proves tamper-evidence
- **Judges see real hash chaining** without needing MetaMask

### Offline Strategy (Rural India Focus)
- `useOfflineSync.js` monitors `window.online/offline` events
- Alerts stored in **IndexedDB** via `idb` library (offline queue)
- `POST /alerts/bulk-sync` endpoint accepts array of alerts at once
- On reconnect: auto-sync → blockchain is retroactively updated
- UI shows "📡 Store & Forward Active" banner when offline

---

## ⚠️ Known Issues / What to Fix Next

1. **MediaPipe model loading** requires internet (CDN) on first load
   - Fix: Download models and serve from `/public/models/`
   - CDN URL: `https://storage.googleapis.com/mediapipe-models/...`

2. **Phone detection heuristic** may false-positive
   - Current: wrist-above-elbow + wrists-close heuristic
   - Better: Add MediaPipe Object Detection model for phone class

3. **No authentication** — any client can call the API
   - Add JWT tokens if deploying beyond demo

4. **Session polling** is every 8s — could use WebSockets for real-time
   - Replace `setInterval` in `App.jsx` with `useWebSocket` hook

5. **chain.json** grows unbounded — add block pruning for production

---

## 🎯 Demo Script for Judges

> "ExamGuard Pro solves remote exam integrity for India's 50M+ students taking competitive exams."

1. **Show the 3-panel UI** → "Left: session management. Center: AI analysis. Right: Blockchain audit."

2. **Create a session** → "Each session is a tamper-proof record."

3. **Run AI on video** → "This is MediaPipe running entirely in the browser — no server-side AI needed. Zero latency."

4. **Show alerts firing** → "Face detected absent → immediately logged to blockchain with SHA-256 hash."

5. **Show Chain tab** → "Every alert = one block. Previous hash is embedded. You cannot delete or alter a past record."

6. **Demo offline** → disconnect WiFi → "In rural Rajasthan exam centers, internet cuts out. Our Store-and-Forward caches everything in IndexedDB." → reconnect → "Auto-sync. Zero data loss."

7. **Key stat to mention**: "We process 2 frames per second in-browser. YOLOv8 would need a GPU server. We run on any laptop."

---

## 📦 Dependencies Summary

### Backend (Python 3.9+)
- `fastapi` + `uvicorn` — API server
- `sqlalchemy` + `aiosqlite` — SQLite ORM
- `pydantic` — validation

### Frontend (Node 18+)
- `react` + `vite` — framework
- `@mediapipe/tasks-vision` — AI detection (WASM, browser-native)
- `idb` — IndexedDB wrapper (offline queue)
- `axios` — HTTP client
- `recharts` — charts (available for future use)

---

## 🔗 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /sessions | Create exam session |
| GET | /sessions | List all sessions |
| PATCH | /sessions/{id}/end | End session |
| POST | /alerts | Log single alert |
| POST | /alerts/bulk-sync | Sync offline queue |
| GET | /alerts/{session_id} | Get session alerts |
| GET | /alerts/report/{session_id} | Full report |
| GET | /blockchain/chain | Full chain dump |
| GET | /blockchain/verify | Tamper check |
| GET | /blockchain/stats | Stats + event breakdown |

**API Docs auto-generated**: http://localhost:8000/docs (Swagger UI)
