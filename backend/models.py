"""
ExamGuard Pro - Pydantic Models
================================
Request/response schemas for all API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


# ─── Session Models ───────────────────────────────────────────────────────────

class SessionCreateRequest(BaseModel):
    student_id: str = Field(..., example="STU-2024-001")
    student_name: str = Field(..., example="Ravi Kumar")
    exam_name: str = Field(..., example="JEE Advanced Mock - Paper 1")


class SessionResponse(BaseModel):
    session_id: str = Field(alias='id')
    student_id: str
    student_name: str
    exam_name: str
    started_at: datetime
    status: str
    risk_score: float
    total_alerts: int

    model_config = {'from_attributes': True, 'populate_by_name': True}


# ─── Alert Models ─────────────────────────────────────────────────────────────

class AlertType:
    FACE_ABSENT = "face_absent"
    MULTIPLE_FACES = "multiple_faces"
    PHONE_DETECTED = "phone_detected"
    LOOKING_AWAY = "looking_away"
    SUSPICIOUS_OBJECT = "suspicious_object"
    AUDIO_ANOMALY = "audio_anomaly"


ALERT_SEVERITY = {
    AlertType.FACE_ABSENT: 0.9,
    AlertType.MULTIPLE_FACES: 1.0,
    AlertType.PHONE_DETECTED: 1.0,
    AlertType.LOOKING_AWAY: 0.6,
    AlertType.SUSPICIOUS_OBJECT: 0.8,
    AlertType.AUDIO_ANOMALY: 0.5,
}

ALERT_LABELS = {
    AlertType.FACE_ABSENT: "Face Not Detected",
    AlertType.MULTIPLE_FACES: "Multiple Faces",
    AlertType.PHONE_DETECTED: "Phone/Device Detected",
    AlertType.LOOKING_AWAY: "Looking Away from Screen",
    AlertType.SUSPICIOUS_OBJECT: "Suspicious Object",
    AlertType.AUDIO_ANOMALY: "Audio Anomaly",
}


class AlertCreateRequest(BaseModel):
    session_id: str
    student_id: str
    alert_type: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    frame_number: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = {}
    # Offline sync flag - if True, this alert was cached and is being synced now
    offline_cached: bool = False
    cached_at: Optional[str] = None   # ISO timestamp from when it was cached offline


class AlertResponse(BaseModel):
    id: int
    session_id: str
    student_id: str
    alert_type: str
    alert_label: str
    confidence: float
    severity: float
    timestamp: datetime
    frame_number: Optional[int]
    block_hash: Optional[str]
    synced: bool

    class Config:
        from_attributes = True


class BulkAlertSyncRequest(BaseModel):
    """For offline Store-and-Forward: batch sync of queued alerts."""
    alerts: List[AlertCreateRequest]


class BulkAlertSyncResponse(BaseModel):
    synced_count: int
    failed_count: int
    results: List[Dict[str, Any]]


# ─── Blockchain Models ────────────────────────────────────────────────────────

class BlockchainStatsResponse(BaseModel):
    total_blocks: int
    total_events: int
    event_breakdown: Dict[str, int]
    genesis_hash: Optional[str]
    latest_hash: Optional[str]
    chain_valid: bool
    verification_message: str


# ─── Report Models ────────────────────────────────────────────────────────────

class SessionReportResponse(BaseModel):
    session: SessionResponse
    alerts: List[AlertResponse]
    blockchain_events: List[Dict[str, Any]]
    risk_assessment: str
    recommendation: str
    chain_integrity: bool
