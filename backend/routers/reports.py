from datetime import datetime
from io import StringIO
import csv as csv_module

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/reports", tags=["reports"])

FLAG_ACCURACY_THRESHOLD = 70.0

NORMATIVE = {
    "visual_search": {"accuracy_min": 85.0, "rt_max_ms": 2500.0},
    "memory":        {"accuracy_min": 70.0, "rt_max_ms": 4000.0},
    "reading":       {"accuracy_min": 66.7, "rt_max_ms": 5000.0},
}


def _within_norm(task_type: str, accuracy: float | None, rt_ms: float | None) -> bool:
    norm = NORMATIVE.get(task_type)
    if not norm or accuracy is None or rt_ms is None:
        return False
    return accuracy >= norm["accuracy_min"] and rt_ms <= norm["rt_max_ms"]


@router.get("", response_model=list[schemas.ReportSessionRow])
def list_reports(db: Session = Depends(get_db)):
    rows = (
        db.query(models.TaskSession, models.Patient, models.TaskResult)
        .join(models.Patient, models.TaskSession.patient_id == models.Patient.id)
        .outerjoin(models.TaskResult, models.TaskResult.session_id == models.TaskSession.id)
        .filter(models.TaskSession.status == "completed")
        .order_by(models.TaskSession.started_at.desc())
        .all()
    )

    result = []
    for session, patient, task_result in rows:
        accuracy = task_result.accuracy_pct if task_result else None
        rt_ms = task_result.rt_ms if task_result else None
        duration_s = None
        if session.ended_at and session.started_at:
            duration_s = round((session.ended_at - session.started_at).total_seconds(), 1)

        result.append(schemas.ReportSessionRow(
            session_id=session.id,
            patient_code=patient.patient_code,
            patient_name=patient.name,
            patient_age=patient.age,
            patient_gender=patient.gender,
            task_type=session.task_type,
            accuracy_pct=accuracy,
            rt_ms=rt_ms,
            started_at=session.started_at,
            ended_at=session.ended_at,
            duration_s=duration_s,
            flagged=bool(accuracy is not None and accuracy < FLAG_ACCURACY_THRESHOLD),
            within_norm=_within_norm(session.task_type, accuracy, rt_ms),
        ))

    return result


@router.get("/{session_id}/csv")
def export_csv(session_id: str, db: Session = Depends(get_db)):
    session = db.get(models.TaskSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    patient = db.get(models.Patient, session.patient_id)
    events = (
        db.query(models.GazeEvent)
        .filter(models.GazeEvent.session_id == session_id)
        .order_by(models.GazeEvent.timestamp)
        .all()
    )

    buf = StringIO()
    writer = csv_module.writer(buf)
    writer.writerow(["timestamp_ms", "x", "y", "event_type", "duration_ms"])
    for e in events:
        writer.writerow([e.timestamp, round(e.x, 2), round(e.y, 2), e.event_type, e.duration_ms or ""])

    buf.seek(0)
    fname = f"eyecog_{patient.patient_code}_{session.task_type}_{session.started_at.strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/{session_id}/pdf")
def export_pdf(session_id: str, db: Session = Depends(get_db)):
    session = db.get(models.TaskSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    patient = db.get(models.Patient, session.patient_id)
    task_result = session.result
    accuracy = task_result.accuracy_pct if task_result else None
    rt_ms = task_result.rt_ms if task_result else None

    duration_s = None
    if session.ended_at and session.started_at:
        duration_s = round((session.ended_at - session.started_at).total_seconds(), 1)

    gaze_count = (
        db.query(func.count(models.GazeEvent.id))
        .filter(models.GazeEvent.session_id == session_id)
        .scalar() or 0
    )
    fixation_count = (
        db.query(func.count(models.GazeEvent.id))
        .filter(models.GazeEvent.session_id == session_id,
                models.GazeEvent.event_type == "fixation")
        .scalar() or 0
    )
    avg_fixation_ms = (
        db.query(func.avg(models.GazeEvent.duration_ms))
        .filter(models.GazeEvent.session_id == session_id,
                models.GazeEvent.event_type == "fixation",
                models.GazeEvent.duration_ms.isnot(None))
        .scalar()
    )

    pdf_bytes = _build_pdf(
        patient=patient, session=session,
        accuracy=accuracy, rt_ms=rt_ms, duration_s=duration_s,
        gaze_count=gaze_count, fixation_count=fixation_count,
        avg_fixation_ms=avg_fixation_ms,
        within_norm=_within_norm(session.task_type, accuracy, rt_ms),
    )

    fname = f"eyecog_{patient.patient_code}_{session.task_type}_{session.started_at.strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


def _build_pdf(patient, session, accuracy, rt_ms, duration_s,
               gaze_count, fixation_count, avg_fixation_ms, within_norm) -> bytes:
    from fpdf import FPDF

    TEAL  = (20, 184, 166)
    NAVY  = (15, 27, 45)
    SLATE = (100, 116, 139)
    GREEN = (16, 185, 129)
    RED   = (239, 68, 68)
    AMBER = (245, 158, 11)

    TASK_LABELS = {
        "visual_search": "Visual Search",
        "memory":        "Memory & Recognition",
        "reading":       "Reading Task",
    }

    pdf = FPDF()
    pdf.add_page()
    pdf.set_margins(20, 20, 20)

    # Header
    pdf.set_fill_color(*NAVY)
    pdf.rect(0, 0, 210, 30, "F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_xy(20, 8)
    pdf.cell(0, 10, "EyeCog Clinical Report", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_xy(20, 20)
    pdf.set_text_color(160, 210, 200)
    pdf.cell(0, 6, "Visual-Cognitive Assessment Software  v2.0")
    pdf.ln(18)

    def section(title: str):
        pdf.set_fill_color(*TEAL)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 7, f"  {title}", new_x="LMARGIN", new_y="NEXT", fill=True)
        pdf.ln(2)
        pdf.set_text_color(*NAVY)

    def kv(label: str, value: str):
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(55, 6, label)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, value, new_x="LMARGIN", new_y="NEXT")

    # Patient Information
    section("Patient Information")
    kv("Patient Code:", patient.patient_code)
    kv("Name:", patient.name)
    kv("Age:", f"{patient.age} years" if patient.age else "-")
    kv("Gender:", patient.gender or "-")
    pdf.ln(4)

    # Session Information
    section("Session Information")
    kv("Task:", TASK_LABELS.get(session.task_type, session.task_type))
    kv("Date:", session.started_at.strftime("%Y-%m-%d %H:%M UTC"))
    kv("Duration:", f"{duration_s}s" if duration_s else "-")
    kv("Status:", session.status.capitalize())
    pdf.ln(4)

    # Performance Results
    section("Performance Results")
    kv("Accuracy:", f"{round(accuracy)}%" if accuracy is not None else "-")
    kv("Avg Reaction Time:", f"{round(rt_ms / 1000, 1)}s" if rt_ms else "-")
    pdf.ln(4)

    # Normative Comparison
    norm = NORMATIVE.get(session.task_type, {})
    section("Normative Comparison  (Adult, 18-65 yrs)")
    if norm:
        kv("Expected Accuracy:", f">= {norm['accuracy_min']}%")
        kv("Expected RT:", f"<= {round(norm['rt_max_ms'] / 1000, 1)}s")
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(55, 6, "Assessment:")
        if within_norm:
            pdf.set_text_color(*GREEN)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 6, "Within normal range", new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.set_text_color(*RED)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 6, "Below normal range - review recommended", new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(*NAVY)
    pdf.ln(4)

    # Gaze Data Summary
    section("Gaze Data Summary")
    kv("Total Gaze Events:", str(gaze_count))
    kv("Fixations Detected:", str(fixation_count))
    kv("Avg Fixation Duration:", f"{round(avg_fixation_ms)} ms" if avg_fixation_ms else "-")
    pdf.ln(6)

    # Disclaimer
    pdf.set_text_color(*SLATE)
    pdf.set_font("Helvetica", "I", 8)
    pdf.multi_cell(
        0, 4,
        "This report is generated automatically by EyeCog v2.0. Results should be interpreted by "
        "a qualified clinician in conjunction with clinical history. Gaze data was recorded using "
        "a mouse-proxy tracking method; accuracy may differ from validated eye-tracking hardware.",
    )

    # Footer line
    pdf.set_y(-18)
    pdf.set_draw_color(*TEAL)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(2)
    pdf.set_text_color(*SLATE)
    pdf.set_font("Helvetica", "I", 8)
    pdf.cell(0, 5, f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC  |  EyeCog v2.0", align="C")

    return bytes(pdf.output())
