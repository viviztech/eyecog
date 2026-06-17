from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

VALID_TASK_TYPES = {"visual_search", "memory", "reading"}


@router.post("/create", response_model=schemas.SessionRead, status_code=201)
def create_session(payload: schemas.SessionCreate, db: Session = Depends(get_db)):
    if payload.task_type not in VALID_TASK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid task_type: {payload.task_type}")

    patient = db.get(models.Patient, payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    session = models.TaskSession(
        patient_id=payload.patient_id,
        task_type=payload.task_type,
        status="pending",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{session_id}", response_model=schemas.SessionRead)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.get(models.TaskSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{session_id}/complete", response_model=schemas.SessionRead)
def complete_session(
    session_id: str, payload: schemas.SessionCompleteRequest, db: Session = Depends(get_db)
):
    session = db.get(models.TaskSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = session.result
    if result is None:
        result = models.TaskResult(session_id=session_id)
        db.add(result)

    result.accuracy_pct = payload.accuracy_pct
    result.rt_ms = payload.rt_ms
    result.scan_path_json = payload.scan_path_json

    session.status = "completed"
    session.ended_at = datetime.utcnow()

    db.commit()
    db.refresh(session)
    return session
