import { useEffect, useRef, useState } from "react";

export type OnlineSimulatorOptions = {
  min?: number;
  max?: number;
  initial?: number;
  minStep?: number;
  maxStep?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  log?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * useOnlineSimulator
 * - Simulates fluctuating online users between bounds, with random step and interval
 * - Looks natural: small bidirectional steps, uneven timing
 * - Logs to console if log=true
 */
export function useOnlineSimulator(options: OnlineSimulatorOptions = {}) {
  const {
    min = 70,
    max = 130,
    initial,
    minStep = 1,
    maxStep = 3,
    minDelayMs = 900,
    maxDelayMs = 3500,
    log = true,
  } = options;

  const safeInitial = clamp(
    typeof initial === 'number' ? initial : randInt(min, max),
    min,
    max
  );

  const [value, setValue] = useState<number>(safeInitial);
  const valRef = useRef(value);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    valRef.current = value;
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      const delay = randInt(minDelayMs, maxDelayMs);
      timerRef.current = window.setTimeout(() => {
        // Decide direction
        let dir = Math.random() < 0.5 ? -1 : 1;
        if (valRef.current <= min) dir = 1;
        if (valRef.current >= max) dir = -1;
        const step = randInt(minStep, maxStep) * dir;
        const next = clamp(valRef.current + step, min, max);
        if (next !== valRef.current) {
          setValue(next);
          if (log) console.log(`[online] ${next}`);
        }
        schedule();
      }, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, minStep, maxStep, minDelayMs, maxDelayMs, log]);

  return value;
}
