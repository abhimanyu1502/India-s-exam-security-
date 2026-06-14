"""
ExamGuard Pro - Alert Routes
==============================
POST /alerts              → Log a single AI-detected alert
POST /alerts/bulk-sync    → Store-and-Forward: sync offline alerts
GET  /alerts/{session_id} → Get all alerts for a session
GET  /alerts/report/{session_id} → Full session report
"""

import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, Alert, ExamSession
from models import (
    AlertCreateRequest,
    AlertResponse,
    BulkAlertSyncRequest,
    BulkAlertSyncResponse,
    SessionReportResponse,
    SessionResponse,
    ALERT_SEVERITY,
    ALERT_LABELS,
)
from blockchain import blockchain

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def _alert_to_response(alert: Alert) -> AlertResponse:
    return AlertResponse(
        id=alert.id,
        session_id=alert.session_id,
        student_id=alert.student_id,
        alert_type=alert.alert_type,
        alert_label=ALERT_LABELS.get(alert.alert_type, alert.alert_type),
        confidence=alert.confidence,
        severity=ALERT_SEVERITY.get(alert.alert_type, 0.5),
        timestamp=alert.timestamp,
        frame_number=alert.frame_number,
        block_hash=alert.block_hash,
        synced=alert.synced,
    )


def _process_single_alert(payload: AlertCreateRequest, db: Session) -> Alert:
    """Core logic: save alert to DB + append to blockchain."""
    # 1. Write to blockchain
    block = blockchain.add_event(
        session_id=payload.session_id,
        student_id=payload.student_id,
        event_type=payload.alert_type,
        confidence=payload.confidence,
        metadata=payload.metadata or {},
    )

    # 2. Save to SQLite
    alert = Alert(
        session_id=payload.session_id,
        student_id=payload.student_id,
        alert_type=payload.alert_type,
        confidence=payload.confidence,
        timestamp=datetime.utcnow(),
        frame_number=payload.frame_number,
        block_hash=block["hash"],
        synced=True,
        metadata_json=json.dumps(payload.metadata or {}),
    )
    db.add(alert)

    # 3. Update session risk score
    session = db.query(ExamSession).filter(
        ExamSession.id == payload.session_id
    ).first()

    if session:
        severity = ALERT_SEVERITY.get(payload.alert_type, 0.5)
        # Weighted rolling average: new_score = max(current, weighted blend)
        weight = 0.3
        session.risk_score = min(
            1.0,
            session.risk_score * (1 - weight) + severity * payload.confidence * weight,
        )
        session.total_alerts += 1
        if session.risk_score >= 0.7:
            session.status = "flagged"

    db.commit()
    db.refresh(alert)
    return alert


@router.post("", response_model=AlertResponse, status_code=201)
def log_alert(payload: AlertCreateRequest, db: Session = Depends(get_db)):
    """Log a single AI-detected anomaly alert."""
    alert = _process_single_alert(payload, db)
    return _alert_to_response(alert)


@router.post("/bulk-sync", response_model=BulkAlertSyncResponse)
def bulk_sync_alerts(payload: BulkAlertSyncRequest, db: Session = Depends(get_db)):
    """
    Store-and-Forward: Sync a batch of offline-cached alerts.
    Called automatically when the device reconnects to internet.
    """
    results = []
    synced = 0
    failed = 0

    for alert_req in payload.alerts:
        try:
            alert = _process_single_alert(alert_req, db)
            results.append({
                "status": "ok",
                "alert_type": alert_req.alert_type,
                "block_hash": alert.block_hash,
                "offline_cached_at": alert_req.cached_at,
            })
            synced += 1
        except Exception as e:
            results.append({
                "status": "error",
                "alert_type": alert_req.alert_type,
                "error": str(e),
            })
            failed += 1

    return BulkAlertSyncResponse(
        synced_count=synced,
        failed_count=failed,
        results=results,
    )


@router.get("/{session_id}", response_model=List[AlertResponse])
def get_session_alerts(session_id: str, db: Session = Depends(get_db)):
    """Get all alerts logged for a session."""
    alerts = (
        db.query(Alert)
        .filter(Alert.session_id == session_id)
        .order_by(Alert.timestamp.asc())
        .all()
    )
    return [_alert_to_response(a) for a in alerts]


@router.get("/report/{session_id}", response_model=SessionReportResponse)
def get_session_report(session_id: str, db: Session = Depends(get_db)):
    """Full session integrity report with blockchain verification."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    alerts = (
        db.query(Alert)
        .filter(Alert.session_id == session_id)
        .order_by(Alert.timestamp.asc())
        .all()
    )

    chain_events = blockchain.get_session_events(session_id)
    verify = blockchain.verify_chain()

    # Risk Assessment
    if session.risk_score >= 0.8:
        risk = "CRITICAL - Exam likely compromised. Recommend disqualification."
        recommendation = "Flag for manual review immediately."
    elif session.risk_score >= 0.6:
        risk = "HIGH - Multiple suspicious behaviors detected."
        recommendation = "Supervisor should review video recording."
    elif session.risk_score >= 0.3:
        risk = "MEDIUM - Some anomalies detected, may be accidental."
        recommendation = "Log for records, no immediate action needed."
    else:
        risk = "LOW - No significant anomalies detected."
        recommendation = "Exam appears clean."

    return SessionReportResponse(
        session=SessionResponse(
            session_id=session.id,
            student_id=session.student_id,
            student_name=session.student_name,
            exam_name=session.exam_name,
            started_at=session.started_at,
            status=session.status,
            risk_score=session.risk_score,
            total_alerts=session.total_alerts,
        ),
        alerts=[_alert_to_response(a) for a in alerts],
        blockchain_events=chain_events,
        risk_assessment=risk,
        recommendation=recommendation,
        chain_integrity=verify["valid"],
    )
