import axios from "axios";
import type {
  DashboardResponse,
  Patient,
  PatientCreate,
  PatientSummary,
  ReportSession,
  SessionCompletePayload,
  TaskSession,
  TaskType,
} from "@/types";

export const api = axios.create({
  baseURL: "/api",
});

export const getDashboardSummary = async (): Promise<DashboardResponse> => {
  const { data } = await api.get<DashboardResponse>("/dashboard/summary");
  return data;
};

export const listPatients = async (): Promise<PatientSummary[]> => {
  const { data } = await api.get<PatientSummary[]>("/patients");
  return data;
};

export const getPatient = async (id: string): Promise<Patient> => {
  const { data } = await api.get<Patient>(`/patients/${id}`);
  return data;
};

export const createPatient = async (payload: PatientCreate): Promise<Patient> => {
  const { data } = await api.post<Patient>("/patients", payload);
  return data;
};

export const createSession = async (
  patientId: string,
  taskType: TaskType,
): Promise<TaskSession> => {
  const { data } = await api.post<TaskSession>("/sessions/create", {
    patient_id: patientId,
    task_type: taskType,
  });
  return data;
};

export const getReports = async (): Promise<ReportSession[]> => {
  const { data } = await api.get<ReportSession[]>("/reports");
  return data;
};

export const completeSession = async (
  sessionId: string,
  payload: SessionCompletePayload,
): Promise<TaskSession> => {
  const { data } = await api.post<TaskSession>(`/sessions/${sessionId}/complete`, payload);
  return data;
};
