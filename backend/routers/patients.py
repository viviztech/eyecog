from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/patients", tags=["patients"])


def _next_patient_code(db: Session) -> str:
    count = db.query(func.count(models.Patient.id)).scalar() or 0
    return f"P-{count + 1:03d}"


@router.post("", response_model=schemas.PatientRead, status_code=201)
def create_patient(payload: schemas.PatientCreate, db: Session = Depends(get_db)):
    patient = models.Patient(
        patient_code=payload.patient_code or _next_patient_code(db),
        name=payload.name,
        age=payload.age,
        gender=payload.gender,
        visual_diagnosis=payload.visual_diagnosis,
    )
    db.add(patient)
    db.flush()  # assign patient.id before attaching children

    if payload.visual_history:
        db.add(models.VisualHistory(
            patient_id=patient.id,
            **payload.visual_history.model_dump(),
        ))

    if payload.clinical_findings:
        db.add(models.ClinicalFindings(
            patient_id=patient.id,
            **payload.clinical_findings.model_dump(),
        ))

    db.commit()
    db.refresh(patient)
    return patient


@router.get("", response_model=list[schemas.PatientSummary])
def list_patients(db: Session = Depends(get_db)):
    return (
        db.query(models.Patient)
        .order_by(models.Patient.created_at.desc())
        .all()
    )


@router.get("/{patient_id}", response_model=schemas.PatientRead)
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.get(models.Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
