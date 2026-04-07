/**
 * useTimer hook — starts an elapsed-seconds counter when the component mounts
 * and returns a human-readable formatted time string that updates every second.
 *
 * @example
 * ```tsx
 * const elapsed = useTimer(); // "0s", "1m 5s", "12m 34s", ...
 * ```
 *
 * @returns A formatted elapsed time string such as `"0s"`, `"45s"`, `"1m 5s"`, `"12m 34s"`.
 */

import { useState, useEffect } from "react";

/**
 * Formats a number of elapsed seconds into a human-readable string.
 *
 * - Seconds only when elapsed < 60s  → `"5s"`
 * - Minutes and seconds otherwise    → `"1m 5s"`, `"12m 34s"`
 *
 * @param seconds - Total elapsed seconds (non-negative integer).
 * @returns Formatted time string.
 */
export function formatElapsed(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/**
 * React hook that counts elapsed seconds since the component mounted and
 * returns the count as a formatted string (e.g. `"0s"`, `"12m 34s"`).
 *
 * The counter increments every second via `setInterval` and is cleaned up
 * automatically when the component unmounts.
 *
 * @returns Formatted elapsed time string, updated every second.
 */
export function useTimer(): string {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(id);
    };
  }, []);

  return formatElapsed(elapsed);
}
