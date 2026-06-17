import type { GazePoint } from "@/types";

interface ScanPathViewProps {
  points: GazePoint[];
  width: number;
  height: number;
}

export function ScanPathView({ points, width, height }: ScanPathViewProps) {
  const raw = points.filter((p) => p.event_type !== "fixation");
  const fixations = points.filter((p) => p.event_type === "fixation");

  if (raw.length === 0 && fixations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No gaze data recorded.
      </div>
    );
  }

  const path = raw.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full rounded-md bg-slate-50">
      {path && (
        <polyline
          points={path}
          fill="none"
          stroke="#14b8a6"
          strokeWidth={1.5}
          strokeOpacity={0.4}
        />
      )}
      {fixations.map((f, i) => (
        <circle
          key={i}
          cx={f.x}
          cy={f.y}
          r={Math.min(4 + (f.duration_ms ?? 0) / 60, 24)}
          fill="#f97316"
          fillOpacity={0.35}
          stroke="#f97316"
          strokeOpacity={0.6}
        />
      ))}
    </svg>
  );
}
