import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Target, Brain, BookOpenText } from "lucide-react";
import { createPatient, createSession } from "@/lib/api";
import { useSessionStore } from "@/stores/sessionStore";
import { FormSection } from "@/components/forms/FormSection";
import { Field } from "@/components/forms/Field";
import { ToggleGroup } from "@/components/forms/ToggleGroup";
import type { Patient, RefractiveStatus, ScreenTimeBucket, TaskType } from "@/types";

interface FormState {
  patientCode: string;
  name: string;
  age: string;
  gender: string[];
  refractiveStatus: string[];
  spectacleUse: string[];
  avgScreenTime: string[];
  distanceVaOd: string;
  distanceVaOs: string;
  nearVaOu: string;
  refractiveErrorOd: string;
  refractiveErrorOs: string;
  npcCm: string;
  accommodationAmplitudeOd: string;
  accommodationAmplitudeOs: string;
  accommodativeFacilityOd: string;
  accommodativeFacilityOs: string;
  accommodativeFacilityOu: string;
  vergenceFacility: string;
  acARatio: string;
  positiveFusionalVergence: string;
  negativeFusionalVergence: string;
  examinerName: string;
}

const initialForm: FormState = {
  patientCode: "",
  name: "",
  age: "",
  gender: [],
  refractiveStatus: [],
  spectacleUse: [],
  avgScreenTime: [],
  distanceVaOd: "",
  distanceVaOs: "",
  nearVaOu: "",
  refractiveErrorOd: "",
  refractiveErrorOs: "",
  npcCm: "",
  accommodationAmplitudeOd: "",
  accommodationAmplitudeOs: "",
  accommodativeFacilityOd: "",
  accommodativeFacilityOs: "",
  accommodativeFacilityOu: "",
  vergenceFacility: "",
  acARatio: "",
  positiveFusionalVergence: "",
  negativeFusionalVergence: "",
  examinerName: "",
};

const numOrNull = (value: string): number | null => (value.trim() === "" ? null : Number(value));
const strOrNull = (value: string): string | null => (value.trim() === "" ? null : value);

const TASK_OPTIONS: { type: TaskType; label: string; icon: typeof Target; description: string }[] = [
  { type: "visual_search", label: "Visual Search", icon: Target, description: "Grid-based target detection task" },
  { type: "memory", label: "Memory Task", icon: Brain, description: "Stimulus-delay-recall paradigm" },
  { type: "reading", label: "Reading Task", icon: BookOpenText, description: "Per-word fixation & comprehension" },
];

export function NewSessionPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const navigate = useNavigate();
  const { setPatient, setSession } = useSessionStore();

  const patientMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: (patient) => {
      setCreatedPatient(patient);
      setPatient(patient);
    },
  });

  const sessionMutation = useMutation({
    mutationFn: ({ patientId, taskType }: { patientId: string; taskType: TaskType }) =>
      createSession(patientId, taskType),
    onSuccess: (session, variables) => {
      setSession(session);
      const route =
        variables.taskType === "visual_search"
          ? "/tasks/visual-search"
          : variables.taskType === "memory"
            ? "/tasks/memory"
            : "/tasks/reading";
      navigate(route);
    },
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    patientMutation.mutate({
      patient_code: form.patientCode.trim() || undefined,
      name: form.name.trim(),
      age: numOrNull(form.age) ?? undefined,
      gender: form.gender[0] ?? undefined,
      visual_history: {
        refractive_status: form.refractiveStatus as RefractiveStatus[],
        spectacle_use: form.spectacleUse[0] === "yes" ? true : form.spectacleUse[0] === "no" ? false : null,
        avg_screen_time: (form.avgScreenTime[0] as ScreenTimeBucket | undefined) ?? null,
      },
      clinical_findings: {
        distance_va_od: strOrNull(form.distanceVaOd),
        distance_va_os: strOrNull(form.distanceVaOs),
        near_va_ou: strOrNull(form.nearVaOu),
        refractive_error_od: strOrNull(form.refractiveErrorOd),
        refractive_error_os: strOrNull(form.refractiveErrorOs),
        npc_cm: numOrNull(form.npcCm),
        accommodation_amplitude_od: numOrNull(form.accommodationAmplitudeOd),
        accommodation_amplitude_os: numOrNull(form.accommodationAmplitudeOs),
        accommodative_facility_od: numOrNull(form.accommodativeFacilityOd),
        accommodative_facility_os: numOrNull(form.accommodativeFacilityOs),
        accommodative_facility_ou: numOrNull(form.accommodativeFacilityOu),
        vergence_facility: numOrNull(form.vergenceFacility),
        ac_a_ratio: strOrNull(form.acARatio),
        positive_fusional_vergence: strOrNull(form.positiveFusionalVergence),
        negative_fusional_vergence: strOrNull(form.negativeFusionalVergence),
        examiner_name: strOrNull(form.examinerName),
      },
    });
  };

  if (createdPatient) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-10 w-10 text-eyecog-green" />
        <h2 className="mt-3 text-lg font-semibold text-slate-800">Patient registered</h2>
        <p className="mt-1 text-sm text-slate-500">
          {createdPatient.name} was assigned ID{" "}
          <span className="font-semibold text-slate-700">{createdPatient.patient_code}</span>.
        </p>

        <p className="mt-6 text-sm font-medium text-slate-600">Start a task module</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TASK_OPTIONS.map(({ type, label, icon: Icon, description }) => (
            <button
              key={type}
              type="button"
              disabled={sessionMutation.isPending}
              onClick={() => sessionMutation.mutate({ patientId: createdPatient.id, taskType: type })}
              className="flex flex-col items-center gap-2 rounded-md border border-slate-200 p-4 text-center transition-colors hover:border-eyecog-teal hover:bg-eyecog-teal/5 disabled:opacity-50"
            >
              <Icon className="h-6 w-6 text-eyecog-teal" />
              <span className="text-sm font-semibold text-slate-700">{label}</span>
              <span className="text-xs text-slate-400">{description}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setCreatedPatient(null);
            setForm(initialForm);
          }}
          className="mt-6 text-sm font-medium text-eyecog-teal hover:underline"
        >
          Register another patient
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Patient Information Form</h2>
        <p className="mt-1 text-sm text-slate-500">
          Complete demographic, visual history and clinical findings before starting an assessment.
        </p>
      </div>

      <FormSection title="1. Basic Demographic Details">
        <Field label="Patient ID" value={form.patientCode} onChange={(v) => set("patientCode", v)}
               placeholder="Auto-assigned if left blank" hint="e.g. P-007" />
        <Field label="Name (or Initials)" value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. A.S." />
        <Field label="Age" type="number" value={form.age} onChange={(v) => set("age", v)} />
        <ToggleGroup
          label="Gender"
          options={[
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
            { label: "Other", value: "other" },
          ]}
          value={form.gender}
          onChange={(v) => set("gender", v)}
        />
      </FormSection>

      <FormSection title="2. Visual History">
        <div className="sm:col-span-2 lg:col-span-3">
          <ToggleGroup
            label="Refractive Status"
            multiple
            options={[
              { label: "Emmetropia", value: "emmetropia" },
              { label: "Myopia", value: "myopia" },
              { label: "Hyperopia", value: "hyperopia" },
              { label: "Astigmatism", value: "astigmatism" },
            ]}
            value={form.refractiveStatus}
            onChange={(v) => set("refractiveStatus", v)}
          />
        </div>
        <ToggleGroup
          label="Spectacle Use"
          options={[
            { label: "Yes", value: "yes" },
            { label: "No", value: "no" },
          ]}
          value={form.spectacleUse}
          onChange={(v) => set("spectacleUse", v)}
        />
      </FormSection>

      <FormSection title="3. Digital Device Usage">
        <div className="sm:col-span-2 lg:col-span-3">
          <ToggleGroup
            label="Average Screen Time Per Day"
            options={[
              { label: "Less than 2 hours", value: "<2h" },
              { label: "2–4 hours", value: "2-4h" },
              { label: "4–6 hours", value: "4-6h" },
              { label: "More than 6 hours", value: ">6h" },
            ]}
            value={form.avgScreenTime}
            onChange={(v) => set("avgScreenTime", v)}
          />
        </div>
      </FormSection>

      <FormSection
        title="5. Clinical Vision Findings"
        description="These values should be entered by the examiner."
      >
        <Field label="Distance VA — OD" value={form.distanceVaOd} onChange={(v) => set("distanceVaOd", v)} placeholder="e.g. 6/6" />
        <Field label="Distance VA — OS" value={form.distanceVaOs} onChange={(v) => set("distanceVaOs", v)} placeholder="e.g. 6/6" />
        <Field label="Near VA — OU" value={form.nearVaOu} onChange={(v) => set("nearVaOu", v)} placeholder="e.g. N6" />

        <Field label="Refractive Error — OD" value={form.refractiveErrorOd} onChange={(v) => set("refractiveErrorOd", v)} placeholder="e.g. -1.00 DS" />
        <Field label="Refractive Error — OS" value={form.refractiveErrorOs} onChange={(v) => set("refractiveErrorOs", v)} placeholder="e.g. -1.00 DS" />
        <Field label="Near Point of Convergence (NPC)" type="number" value={form.npcCm} onChange={(v) => set("npcCm", v)} suffix="cm" hint="Example: NPC = 6 cm" />

        <Field label="Accommodation Amplitude — OD" type="number" value={form.accommodationAmplitudeOd} onChange={(v) => set("accommodationAmplitudeOd", v)} suffix="D" />
        <Field label="Accommodation Amplitude — OS" type="number" value={form.accommodationAmplitudeOs} onChange={(v) => set("accommodationAmplitudeOs", v)} suffix="D" />
        <div />

        <Field label="Accommodative Facility — OD" type="number" value={form.accommodativeFacilityOd} onChange={(v) => set("accommodativeFacilityOd", v)} suffix="cpm" />
        <Field label="Accommodative Facility — OS" type="number" value={form.accommodativeFacilityOs} onChange={(v) => set("accommodativeFacilityOs", v)} suffix="cpm" />
        <Field label="Accommodative Facility — OU" type="number" value={form.accommodativeFacilityOu} onChange={(v) => set("accommodativeFacilityOu", v)} suffix="cpm" />

        <Field label="Vergence Facility" type="number" value={form.vergenceFacility} onChange={(v) => set("vergenceFacility", v)} suffix="cpm" />
        <Field label="AC/A Ratio" value={form.acARatio} onChange={(v) => set("acARatio", v)} placeholder="e.g. 4:1" />
        <div />

        <Field label="Positive Fusional Vergence" value={form.positiveFusionalVergence} onChange={(v) => set("positiveFusionalVergence", v)} placeholder="e.g. 12/18/10" />
        <Field label="Negative Fusional Vergence" value={form.negativeFusionalVergence} onChange={(v) => set("negativeFusionalVergence", v)} placeholder="e.g. 8/14/6" />
        <Field label="Examiner Name" value={form.examinerName} onChange={(v) => set("examinerName", v)} />
      </FormSection>

      {patientMutation.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to register patient. Please check the form and try again.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!form.name.trim() || patientMutation.isPending}
          className="rounded-md bg-eyecog-teal px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {patientMutation.isPending ? "Saving…" : "Register Patient & Continue"}
        </button>
      </div>
    </form>
  );
}
