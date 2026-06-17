import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, Clock, PlusCircle, Target } from "lucide-react";
import { getDashboardSummary } from "@/lib/api";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SessionsTable } from "@/components/dashboard/SessionsTable";

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Overview of today&apos;s sessions and clinical alerts.
        </p>
        <Link
          to="/new-session"
          className="flex items-center gap-2 rounded-md bg-eyecog-teal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-600"
        >
          <PlusCircle className="h-4 w-4" />
          New Session
        </Link>
      </div>

      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load dashboard data. Is the backend running on port 8000?
        </div>
      )}

      {data && data.kpis.flagged_cases > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          <AlertTriangle className="h-4 w-4" />
          {data.kpis.flagged_cases} session{data.kpis.flagged_cases > 1 ? "s" : ""} flagged
          with accuracy below 70% — review recommended.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Sessions Today"
          value={isLoading ? "—" : String(data?.kpis.sessions_today ?? 0)}
          icon={Activity}
          accent="blue"
        />
        <KpiCard
          label="Avg Accuracy"
          value={isLoading || data?.kpis.avg_accuracy == null ? "—" : `${data.kpis.avg_accuracy}%`}
          icon={Target}
          accent="green"
        />
        <KpiCard
          label="Flagged Cases"
          value={isLoading ? "—" : String(data?.kpis.flagged_cases ?? 0)}
          icon={AlertTriangle}
          accent="orange"
        />
        <KpiCard
          label="Avg Task Time"
          value={isLoading || data?.kpis.avg_task_time_s == null ? "—" : `${data.kpis.avg_task_time_s}s`}
          icon={Clock}
          accent="teal"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg bg-eyecog-navy p-5 text-slate-300 shadow-sm lg:col-span-1">
          <h2 className="text-sm font-semibold text-white">Live Gaze Heatmap</h2>
          <p className="mt-1 text-xs text-slate-400">
            Real-time fixation intensity appears here during an active session.
          </p>
          <div className="mt-4 flex h-40 items-center justify-center rounded-md border border-dashed border-eyecog-navy-light text-xs text-slate-500">
            No active session
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700">Recent Sessions</h2>
          <div className="mt-3">
            {isLoading ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                Loading sessions&hellip;
              </div>
            ) : (
              <SessionsTable sessions={data?.recent_sessions ?? []} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
