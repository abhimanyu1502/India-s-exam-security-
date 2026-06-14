"""
ExamGuard Pro - Database Setup
================================
SQLite via SQLAlchemy for session and alert persistence.
"""

from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os

DATABASE_URL = "sqlite:///./examguard.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, index=True)
    student_name = Column(String)
    exam_name = Column(String)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String, default="active")  # active, completed, flagged
    risk_score = Column(Float, default=0.0)
    total_alerts = Column(Integer, default=0)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, index=True)
    student_id = Column(String)
    alert_type = Column(String)       # face_absent, multiple_faces, phone_detected, looking_away
    confidence = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    frame_number = Column(Integer, nullable=True)
    block_hash = Column(String, nullable=True)   # Reference to blockchain block
    synced = Column(Boolean, default=True)       # False = created offline
    metadata_json = Column(Text, default="{}")


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency: yield a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
