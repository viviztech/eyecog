import { create } from "zustand";
import type { Patient, TaskSession } from "@/types";

interface SessionState {
  patient: Patient | null;
  session: TaskSession | null;
  setPatient: (patient: Patient | null) => void;
  setSession: (session: TaskSession | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  patient: null,
  session: null,
  setPatient: (patient) => set({ patient }),
  setSession: (session) => set({ session }),
  reset: () => set({ patient: null, session: null }),
}));
