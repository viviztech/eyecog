import { useCallback, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, LayoutDashboard, RotateCcw, Target } from "lucide-react";

import { useSessionStore } from "@/stores/sessionStore";
import { ToggleGroup } from "@/components/forms/ToggleGroup";
import { GazeCursor } from "@/components/tasks/GazeCursor";
import { VisualSearchGrid } from "@/components/tasks/VisualSearchGrid";
import { ScanPathView } from "@/components/tasks/ScanPathView";
import { useGazeStream } from "@/hooks/useGazeStream";
import { useFixationDetection } from "@/hooks/useFixationDetection";
import { generateTrials, type Trial } from "@/lib/visualSearch";
import { completeSession } from "@/lib/api";
import { formatAccuracy, formatSeconds, accuracyColor } from "@/lib/format";
import type { GazePoint } from "@/types";

const PANEL_WIDTH = 640;
const PANEL_HEIGHT = 460;
const GRID_WRAPPER_PX = 360;
const TRIAL_COUNT = 8;
const FEEDBACK_DELAY_MS = 500;
const GAZE_SAMPLE_INTERVAL_MS = 33; // ~30 Hz
const SCAN_PATH_MAX_POINTS = 600;

const GRID_SIZE_OPTIONS = [
  { label: "4 × 4", value: "4" },
  { label: "5 × 5", value: "5" },
  { label: "6 × 6", value: "6" },
  { label: "8 × 8", value: "8" },
];

type Phase = "setup" | "running" | "results";

interface TrialOutcome {
  correct: boolean;
  rt_ms: number;
}

interface ResultSummary {
  accuracy_pct: number;
  rt_ms: number;
}

export function VisualSearchTaskPage() {
  const { patient, session, setSession, reset } = useSessionStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>("setup");
  const [gridSize, setGridSize] = useState(5);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [trialIndex, setTrialIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ index: number; correct: boolean } | null>(null);
  const [gazePos, setGazePos] = useState({ x: PANEL_WIDTH / 2, y: PANEL_HEIGHT / 2 });
  const [gazeVisible, setGazeVisible] = useState(false);
  const [resultSummary, setResultSummary] = useState<ResultSummary | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const trialStartRef = useRef(0);
  const taskStartRef = useRef(0);
  const lastSampleRef = useRef(0);
  const scanPathRef = useRef<GazePoint[]>([]);
  const outcomesRef = useRef<TrialOutcome[]>([]);

  const completeMutation = useMutation({
    mutationFn: (payload: { accuracy_pct: number; rt_ms: number; scan_path_json: string }) =>
      completeSession(session!.id, payload),
    onSuccess: (updatedSession) => {
      setSession(updatedSession);
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const gazePush = useGazeStream(phase === "running" ? session?.id ?? null : null);

  const handleFixation = useCallback((point: GazePoint) => {
    gazePush(point);
    scanPathRef.current.push(point);
  }, [gazePush]);

  const fixation = useFixationDetection(handleFixation);

  if (!session || session.task_type !== "visual_search") {
    return (
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
        <Target className="mx-auto h-10 w-10 text-eyecog-teal" />
        <h2 className="mt-3 text-lg font-semibold text-slate-800">No active Visual Search session</h2>
        <p className="mt-1 text-sm text-slate-500">
          Register a patient and start a Visual Search session to begin the task.
        </p>
        <Link
          to="/new-session"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-eyecog-teal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-600"
        >
          New Session
        </Link>
      </div>
    );
  }

  const startTask = () => {
    setTrials(generateTrials(gridSize, TRIAL_COUNT));
    setTrialIndex(0);
    setFeedback(null);
    setResultSummary(null);
    outcomesRef.current = [];
    scanPathRef.current = [];
    fixation.reset();
    taskStartRef.current = performance.now();
    trialStartRef.current = performance.now();
    setPhase("running");
  };

  const finishTask = (outcomes: TrialOutcome[]) => {
    const correctCount = outcomes.filter((o) => o.correct).length;
    const accuracy_pct = (correctCount / outcomes.length) * 100;
    const rt_ms = outcomes.reduce((sum, o) => sum + o.rt_ms, 0) / outcomes.length;

    setResultSummary({ accuracy_pct, rt_ms });
    setPhase("results");

    const scan_path_json = JSON.stringify(scanPathRef.current.slice(-SCAN_PATH_MAX_POINTS));
    completeMutation.mutate({ accuracy_pct, rt_ms, scan_path_json });
  };

  const handleCellClick = (index: number) => {
    if (feedback !== null) return;

    const trial = trials[trialIndex];
    const correct = index === trial.targetIndex;
    const rt_ms = performance.now() - trialStartRef.current;
    outcomesRef.current = [...outcomesRef.current, { correct, rt_ms }];
    setFeedback({ index, correct });

    window.setTimeout(() => {
      if (trialIndex + 1 < trials.length) {
        setTrialIndex((i) => i + 1);
        trialStartRef.current = performance.now();
        setFeedback(null);
      } else {
        finishTask(outcomesRef.current);
      }
    }, FEEDBACK_DELAY_MS);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== "running" || !containerRef.current) return;

    const now = performance.now();
    if (now - lastSampleRef.current < GAZE_SAMPLE_INTERVAL_MS) return;
    lastSampleRef.current = now;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = now - taskStartRef.current;

    setGazePos({ x, y });

    const point: GazePoint = { x, y, t, event_type: "raw" };
    gazePush(point);
    scanPathRef.current.push(point);
    fixation.addPoint(x, y, t);
  };

  const handleBackToDashboard = () => {
    reset();
    navigate("/");
  };

  const trial = trials[trialIndex];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {patient && (
        <div className="rounded-md border border-eyecog-teal/30 bg-eyecog-teal/5 px-4 py-3 text-sm text-slate-600">
          Active session for <span className="font-semibold">{patient.name}</span> ({patient.patient_code})
          — Visual Search
        </div>
      )}

      {phase === "setup" && (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <Target className="mx-auto h-10 w-10 text-eyecog-teal" />
          <h2 className="mt-3 text-lg font-semibold text-slate-800">Visual Search Task</h2>
          <p className="mt-1 text-sm text-slate-500">
            {TRIAL_COUNT} trials. Find the odd letter in the grid as quickly as possible.
          </p>

          <div className="mt-6 flex justify-center">
            <ToggleGroup
              label="Grid size"
              options={GRID_SIZE_OPTIONS}
              value={[String(gridSize)]}
              onChange={(value) => {
                if (value.length) setGridSize(Number(value[0]));
              }}
            />
          </div>

          <button
            type="button"
            onClick={startTask}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-eyecog-teal px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-600"
          >
            Start Task
          </button>
        </div>
      )}

      {phase === "running" && trial && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-400">
            <span>
              Trial {trialIndex + 1} of {trials.length}
            </span>
            <span className="rounded-full bg-eyecog-bg px-3 py-1 text-eyecog-teal">
              Fixation: {Math.round(fixation.fixationDurationMs)} ms
            </span>
          </div>

          <div
            ref={containerRef}
            className="relative mx-auto overflow-hidden rounded-md border border-slate-100 bg-slate-50"
            style={{ width: PANEL_WIDTH, height: PANEL_HEIGHT }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setGazeVisible(true)}
            onMouseLeave={() => setGazeVisible(false)}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Find the letter
                </p>
                <p className="text-4xl font-bold text-eyecog-teal">{trial.target}</p>
              </div>

              <div style={{ width: GRID_WRAPPER_PX }}>
                <VisualSearchGrid
                  size={trial.size}
                  cells={trial.cells}
                  onCellClick={handleCellClick}
                  disabled={feedback !== null}
                  feedbackIndex={feedback?.index ?? null}
                  feedbackCorrect={feedback?.correct ?? false}
                />
              </div>
            </div>

            <GazeCursor
              x={gazePos.x}
              y={gazePos.y}
              fixationDurationMs={fixation.fixationDurationMs}
              visible={gazeVisible}
            />
          </div>
        </div>
      )}

      {phase === "results" && resultSummary && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-eyecog-green" />
            <h2 className="mt-3 text-lg font-semibold text-slate-800">Task Complete</h2>

            <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-4">
              <div className="rounded-md border border-slate-100 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Accuracy</p>
                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1 text-lg font-semibold ${accuracyColor(resultSummary.accuracy_pct)}`}
                >
                  {formatAccuracy(resultSummary.accuracy_pct)}
                </span>
              </div>
              <div className="rounded-md border border-slate-100 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Avg Reaction Time</p>
                <p className="mt-1 text-lg font-semibold text-slate-700">
                  {formatSeconds(resultSummary.rt_ms)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={startTask}
                className="inline-flex items-center gap-2 rounded-md border border-eyecog-teal px-4 py-2 text-sm font-semibold text-eyecog-teal hover:bg-eyecog-teal/5"
              >
                <RotateCcw className="h-4 w-4" />
                Run Again
              </button>
              <button
                type="button"
                onClick={handleBackToDashboard}
                className="inline-flex items-center gap-2 rounded-md bg-eyecog-teal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-600"
              >
                <LayoutDashboard className="h-4 w-4" />
                Back to Dashboard
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">Scan Path</h3>
            <p className="mt-1 text-xs text-slate-400">
              Recorded gaze trail (teal) and fixations (orange, sized by duration).
            </p>
            <div className="mt-3" style={{ height: PANEL_HEIGHT * 0.6 }}>
              <ScanPathView points={scanPathRef.current} width={PANEL_WIDTH} height={PANEL_HEIGHT} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
