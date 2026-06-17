import { useCallback, useRef, useState } from "react";
import type { GazePoint } from "@/types";

const DISPERSION_PX = 35;
const MIN_FIXATION_MS = 100;

interface SamplePoint {
  x: number;
  y: number;
  t: number;
}

/**
 * Dispersion-based (I-DT style) fixation detection.
 * Feed it raw gaze samples via `addPoint`; it reports the current
 * in-progress fixation duration and emits a "fixation" GazePoint
 * (via `onFixation`) once a fixation ends.
 */
export function useFixationDetection(onFixation: (point: GazePoint) => void) {
  const windowRef = useRef<SamplePoint[]>([]);
  const [fixationDurationMs, setFixationDurationMs] = useState(0);

  const addPoint = useCallback((x: number, y: number, t: number) => {
    const win = windowRef.current;
    win.push({ x, y, t });

    while (win.length > 1) {
      const xs = win.map((p) => p.x);
      const ys = win.map((p) => p.y);
      const dispersion = Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys));
      if (dispersion <= DISPERSION_PX) break;

      const first = win[0];
      const duration = t - first.t;
      if (duration >= MIN_FIXATION_MS) {
        const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
        onFixation({ x: cx, y: cy, t: first.t, event_type: "fixation", duration_ms: duration });
      }
      win.shift();
    }

    const duration = win.length > 1 ? t - win[0].t : 0;
    setFixationDurationMs(duration >= MIN_FIXATION_MS ? duration : 0);
  }, [onFixation]);

  const reset = useCallback(() => {
    windowRef.current = [];
    setFixationDurationMs(0);
  }, []);

  return { addPoint, fixationDurationMs, reset };
}
