"""
ExamGuard Pro - Session / Auth Routes
=======================================
POST /sessions          → Start a new exam session
GET  /sessions/{id}     → Get session details
GET  /sessions          → List all sessions
PATCH /sessions/{id}/end → End an exam session
"""

import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, ExamSession
from models import SessionCreateRequest, SessionResponse

router = APIRouter(prefix="/sessions", tags=["Sessions"])


def _calculate_risk(session: ExamSession) -> str:
    """Return human-readable risk level from score."""
    if session.risk_score >= 0.8:
        return "CRITICAL"
    elif session.risk_score >= 0.6:
        return "HIGH"
    elif session.risk_score >= 0.3:
        return "MEDIUM"
    return "LOW"


@router.post("", response_model=SessionResponse, status_code=201)
def create_session(payload: SessionCreateRequest, db: Session = Depends(get_db)):
    """Start a new proctored exam session."""
    session_id = f"SES-{uuid.uuid4().hex[:8].upper()}"

    db_session = ExamSession(
        id=session_id,
        student_id=payload.student_id,
        student_name=payload.student_name,
        exam_name=payload.exam_name,
        started_at=datetime.utcnow(),
        status="active",
        risk_score=0.0,
        total_alerts=0,
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@router.get("", response_model=List[SessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    """List all exam sessions, newest first."""
    return db.query(ExamSession).order_by(ExamSession.started_at.desc()).all()


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get a specific session by ID."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/{session_id}/end", response_model=SessionResponse)
def end_session(session_id: str, db: Session = Depends(get_db)):
    """Mark a session as completed."""
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.ended_at = datetime.utcnow()
    session.status = "flagged" if session.risk_score >= 0.6 else "completed"
    db.commit()
    db.refresh(session)
    return session
