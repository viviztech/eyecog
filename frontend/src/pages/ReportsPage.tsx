import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart, FileText, TriangleAlert } from "lucide-react";

import { getReports } from "@/lib/api";
import { formatAccuracy, formatSeconds, accuracyColor, TASK_TYPE_LABELS } from "@/lib/format";
import type { ReportSession, TaskType } from "@/types";

const FILTER_OPTIONS: { label: string; value: "all" | TaskType }[] = [
  { label: "All Tasks", value: "all" },
  { label: "Visual Search", value: "visual_search" },
  { label: "Memory Task", value: "memory" },
  { label: "Reading Task", value: "reading" },
];

function downloadUrl(sessionId: string, format: "pdf" | "csv") {
  return `/api/reports/${sessionId}/${format}`;
}

export function ReportsPage() {
  const [filter, setFilter] = useState<"all" | TaskType>("all");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: getReports,
  });

  const filtered = filter === "all" ? sessions : sessions.filter((s) => s.task_type === filter);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Reports</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {sessions.length} completed session{sessions.length !== 1 ? "s" : ""} — PDF &amp; CSV
            export available
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === opt.value
                ? "border-eyecog-teal bg-eyecog-teal/10 text-eyecog-teal"
                : "border-slate-300 text-slate-600 hover:border-eyecog-teal hover:text-eyecog-teal"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading reports…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FileBarChart className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-500">No completed sessions yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Complete a task module to generate a report.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Task</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Accuracy</th>
                <th className="px-5 py-3">Avg RT</th>
                <th className="px-5 py-3">vs Norm</th>
                <th className="px-5 py-3 text-right">Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((s) => (
                <ReportRow key={s.session_id} session={s} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Normative note */}
      {filtered.length > 0 && (
        <p className="text-right text-xs text-slate-400">
          Normative range: Adult 18–65 yrs. Visual Search ≥ 85% / ≤ 2.5s · Memory ≥ 70% / ≤ 4.0s
          · Reading ≥ 67% / ≤ 5.0s
        </p>
      )}
    </div>
  );
}

function ReportRow({ session: s }: { session: ReportSession }) {
  const date = new Date(s.started_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = new Date(s.started_at).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-5 py-3">
        <span className="font-semibold text-slate-700">{s.patient_code}</span>
        <span className="ml-1.5 text-slate-400">{s.patient_name}</span>
      </td>
      <td className="px-5 py-3 text-slate-600">{TASK_TYPE_LABELS[s.task_type]}</td>
      <td className="px-5 py-3 text-slate-500">
        {date}
        <span className="ml-1 text-slate-400">{time}</span>
      </td>
      <td className="px-5 py-3">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${accuracyColor(s.accuracy_pct)}`}
        >
          {formatAccuracy(s.accuracy_pct)}
        </span>
      </td>
      <td className="px-5 py-3 text-slate-600">{formatSeconds(s.rt_ms)}</td>
      <td className="px-5 py-3">
        {s.accuracy_pct === null ? (
          <span className="text-slate-300">—</span>
        ) : s.within_norm ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            ✓ Normal
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            <TriangleAlert className="h-3 w-3" />
            Below
          </span>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <a
            href={downloadUrl(s.session_id, "pdf")}
            download
            className="inline-flex items-center gap-1 rounded border border-eyecog-teal px-2.5 py-1 text-xs font-medium text-eyecog-teal hover:bg-eyecog-teal/5"
          >
            <FileText className="h-3 w-3" />
            PDF
          </a>
          <a
            href={downloadUrl(s.session_id, "csv")}
            download
            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-slate-400"
          >
            <Download className="h-3 w-3" />
            CSV
          </a>
        </div>
      </td>
    </tr>
  );
}
