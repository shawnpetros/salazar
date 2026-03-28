/**
 * useLogTail hook — watches a log file and emits new lines as they appear.
 *
 * On mount, all existing lines in the file are replayed in order via `onLine`.
 * Subsequently, any lines appended to the file are emitted within ~100ms.
 *
 * Uses `fs.watchFile` with a 50ms poll interval for broad platform compatibility
 * (works on network mounts, Docker volumes, etc. where `fs.watch` may not fire).
 *
 * @example
 * ```tsx
 * useLogTail("/tmp/run.log", (line) => {
 *   console.log("new line:", line);
 * });
 * ```
 */

import { useEffect } from "react";
import fs from "node:fs";

/**
 * Reads new content from a file starting at `offset` bytes, splits it into
 * lines, and returns the non-empty lines along with the new file offset.
 *
 * Skips blank lines that result from trailing newline characters.
 *
 * @param filePath  - Absolute or relative path to the log file.
 * @param offset    - Byte offset at which to start reading (0 = from the beginning).
 * @returns An object containing the array of new lines and the updated byte offset.
 */
export function readNewLines(
  filePath: string,
  offset: number,
): { lines: string[]; newOffset: number } {
  let fd: number | undefined;
  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    if (fileSize <= offset) {
      return { lines: [], newOffset: offset };
    }

    const bytesToRead = fileSize - offset;
    const buffer = Buffer.alloc(bytesToRead);
    fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, bytesToRead, offset);

    const newContent = buffer.toString("utf8");
    // Split on newlines; filter blanks that arise from trailing \n
    const lines = newContent.split("\n").filter((line) => line.length > 0);

    return { lines, newOffset: fileSize };
  } catch {
    return { lines: [], newOffset: offset };
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore close errors
      }
    }
  }
}

/**
 * React hook that tails a log file and calls `onLine` for each line.
 *
 * - Existing lines present when the component mounts are replayed immediately
 *   and in order before any new lines.
 * - New lines appended after mount are delivered within ~100ms (50ms poll).
 * - The watcher is automatically torn down when the component unmounts.
 *
 * @param logPath - Path to the log file to watch.
 * @param onLine  - Callback invoked with each new (or replayed) line string.
 *                  The string does **not** include the trailing newline character.
 */
export function useLogTail(
  logPath: string,
  onLine: (line: string) => void,
): void {
  useEffect(() => {
    let offset = 0;

    // Replay lines already in the file at mount time
    const initial = readNewLines(logPath, 0);
    offset = initial.newOffset;
    for (const line of initial.lines) {
      onLine(line);
    }

    // Listener invoked by watchFile on every stat-change event
    const listener = () => {
      const result = readNewLines(logPath, offset);
      offset = result.newOffset;
      for (const line of result.lines) {
        onLine(line);
      }
    };

    fs.watchFile(logPath, { interval: 50, persistent: false }, listener);

    return () => {
      fs.unwatchFile(logPath, listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logPath]);
}
