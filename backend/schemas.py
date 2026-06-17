from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Visual History (Section 2/3 of intake form)
# ---------------------------------------------------------------------------

class VisualHistoryBase(BaseModel):
    refractive_status: List[str] = []
    spectacle_use: Optional[bool] = None
    avg_screen_time: Optional[str] = None  # "<2h" | "2-4h" | "4-6h" | ">6h"


class VisualHistoryRead(VisualHistoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: str


# ---------------------------------------------------------------------------
# Clinical Findings (Section 5 of intake form, examiner-entered)
# ---------------------------------------------------------------------------

class ClinicalFindingsBase(BaseModel):
    distance_va_od: Optional[str] = None
    distance_va_os: Optional[str] = None
    near_va_ou: Optional[str] = None

    refractive_error_od: Optional[str] = None
    refractive_error_os: Optional[str] = None

    npc_cm: Optional[float] = None

    accommodation_amplitude_od: Optional[float] = None
    accommodation_amplitude_os: Optional[float] = None

    accommodative_facility_od: Optional[float] = None
    accommodative_facility_os: Optional[float] = None
    accommodative_facility_ou: Optional[float] = None

    vergence_facility: Optional[float] = None

    ac_a_ratio: Optional[str] = None

    positive_fusional_vergence: Optional[str] = None
    negative_fusional_vergence: Optional[str] = None

    examiner_name: Optional[str] = None


class ClinicalFindingsRead(ClinicalFindingsBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    recorded_at: datetime


# ---------------------------------------------------------------------------
# Patient
# ---------------------------------------------------------------------------

class PatientCreate(BaseModel):
    patient_code: Optional[str] = None
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    visual_diagnosis: Optional[str] = None
    visual_history: Optional[VisualHistoryBase] = None
    clinical_findings: Optional[ClinicalFindingsBase] = None


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_code: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    visual_diagnosis: Optional[str] = None
    created_at: datetime
    visual_history: Optional[VisualHistoryRead] = None
    clinical_findings: Optional[ClinicalFindingsRead] = None


class PatientSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_code: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

class SessionCreate(BaseModel):
    patient_id: str
    task_type: str  # "visual_search" | "memory" | "reading"


class TaskResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    accuracy_pct: Optional[float] = None
    rt_ms: Optional[float] = None
    scan_path_json: Optional[str] = None


class SessionCompleteRequest(BaseModel):
    accuracy_pct: float
    rt_ms: float
    scan_path_json: Optional[str] = None


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    task_type: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    result: Optional[TaskResultRead] = None


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class KpiSummary(BaseModel):
    sessions_today: int
    avg_accuracy: Optional[float] = None
    flagged_cases: int
    avg_task_time_s: Optional[float] = None


class RecentSessionRow(BaseModel):
    session_id: str
    patient_code: str
    patient_name: str
    task_type: str
    accuracy_pct: Optional[float] = None
    rt_ms: Optional[float] = None
    status: str
    flagged: bool
    started_at: datetime


class DashboardResponse(BaseModel):
    kpis: KpiSummary
    recent_sessions: List[RecentSessionRow]


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class ReportSessionRow(BaseModel):
    session_id: str
    patient_code: str
    patient_name: str
    patient_age: Optional[int]
    patient_gender: Optional[str]
    task_type: str
    accuracy_pct: Optional[float]
    rt_ms: Optional[float]
    started_at: datetime
    ended_at: Optional[datetime]
    duration_s: Optional[float]
    flagged: bool
    within_norm: bool
