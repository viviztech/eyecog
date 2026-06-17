from datetime import datetime, time

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

FLAG_ACCURACY_THRESHOLD = 70.0
RECENT_SESSIONS_LIMIT = 10


@router.get("/summary", response_model=schemas.DashboardResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    today_start = datetime.combine(datetime.utcnow().date(), time.min)

    sessions_today = (
        db.query(func.count(models.TaskSession.id))
        .filter(models.TaskSession.started_at >= today_start)
        .scalar()
        or 0
    )

    avg_accuracy = (
        db.query(func.avg(models.TaskResult.accuracy_pct))
        .filter(models.TaskResult.accuracy_pct.isnot(None))
        .scalar()
    )

    flagged_cases = (
        db.query(func.count(models.TaskResult.id))
        .filter(models.TaskResult.accuracy_pct < FLAG_ACCURACY_THRESHOLD)
        .scalar()
        or 0
    )

    avg_rt_ms = (
        db.query(func.avg(models.TaskResult.rt_ms))
        .filter(models.TaskResult.rt_ms.isnot(None))
        .scalar()
    )
    avg_task_time_s = round(avg_rt_ms / 1000, 1) if avg_rt_ms is not None else None

    rows = (
        db.query(models.TaskSession, models.Patient, models.TaskResult)
        .join(models.Patient, models.TaskSession.patient_id == models.Patient.id)
        .outerjoin(models.TaskResult, models.TaskResult.session_id == models.TaskSession.id)
        .order_by(models.TaskSession.started_at.desc())
        .limit(RECENT_SESSIONS_LIMIT)
        .all()
    )

    recent_sessions = [
        schemas.RecentSessionRow(
            session_id=session.id,
            patient_code=patient.patient_code,
            patient_name=patient.name,
            task_type=session.task_type,
            accuracy_pct=result.accuracy_pct if result else None,
            rt_ms=result.rt_ms if result else None,
            status=session.status,
            flagged=bool(result and result.accuracy_pct is not None
                          and result.accuracy_pct < FLAG_ACCURACY_THRESHOLD),
            started_at=session.started_at,
        )
        for session, patient, result in rows
    ]

    return schemas.DashboardResponse(
        kpis=schemas.KpiSummary(
            sessions_today=sessions_today,
            avg_accuracy=round(avg_accuracy, 1) if avg_accuracy is not None else None,
            flagged_cases=flagged_cases,
            avg_task_time_s=avg_task_time_s,
        ),
        recent_sessions=recent_sessions,
    )
