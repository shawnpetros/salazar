/**
 * History list keyboard navigation handler.
 *
 * Provides a pure function for handling arrow-key navigation and Enter
 * selection within the `harness history` interactive list. This module
 * intentionally contains no Ink / React imports so that it can be exercised
 * in unit tests without a terminal environment.
 *
 * @example
 * ```ts
 * import { handleHistoryKey } from './lib/history-navigation.js';
 *
 * // Inside a useInput callback:
 * useInput((input, key) => {
 *   handleHistoryKey(input, key, {
 *     selectedIndex,
 *     totalItems: records.length,
 *     onNavigate: setSelectedIndex,
 *     onSelect: (i) => setView({ type: 'detail', index: i }),
 *   });
 * });
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Subset of the Ink `Key` object that the history navigator cares about.
 *
 * Keeping this as a standalone interface (rather than importing directly from
 * Ink) lets unit tests pass plain objects without needing a running terminal.
 */
export interface HistoryKeyInput {
  /** `true` when the ↓ arrow key was pressed. */
  downArrow?: boolean;
  /** `true` when the ↑ arrow key was pressed. */
  upArrow?: boolean;
  /** `true` when the Enter / Return key was pressed. */
  return?: boolean;
}

/**
 * Options accepted by {@link handleHistoryKey}.
 */
export interface HistoryNavOptions {
  /**
   * Zero-based index of the currently highlighted row.
   * Must satisfy `0 <= selectedIndex < totalItems`.
   */
  selectedIndex: number;

  /**
   * Total number of items in the list.
   * Navigation is clamped to `[0, totalItems - 1]`.
   */
  totalItems: number;

  /**
   * Called with the new index when the cursor moves up or down.
   * Only fired when the index actually changes (i.e. clamping prevents
   * redundant calls at the list boundaries).
   */
  onNavigate: (newIndex: number) => void;

  /**
   * Called with the currently highlighted index when the user presses Enter.
   * Not called when `totalItems` is 0.
   */
  onSelect: (index: number) => void;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Handles a single keypress event for the interactive history list.
 *
 * - **↓ (downArrow)** — moves the cursor to `selectedIndex + 1`, clamped to
 *   the last item. `onNavigate` is only called when the index changes.
 * - **↑ (upArrow)** — moves the cursor to `selectedIndex - 1`, clamped to
 *   the first item. `onNavigate` is only called when the index changes.
 * - **Enter (return)** — calls `onSelect` with the current `selectedIndex`.
 *   Is a no-op when `totalItems` is 0.
 * - All other keys are silently ignored.
 *
 * @param _input   - The printable character string (unused; present so the
 *   signature matches Ink's `useInput` callback shape).
 * @param key      - Key descriptor from the terminal event.
 * @param options  - Current navigation state and event callbacks.
 *
 * @example
 * ```ts
 * handleHistoryKey('', { downArrow: true }, {
 *   selectedIndex: 0,
 *   totalItems: 3,
 *   onNavigate: setSelectedIndex,
 *   onSelect: openDetail,
 * });
 * // → onNavigate(1) is called
 * ```
 */
export function handleHistoryKey(
  _input: string,
  key: HistoryKeyInput,
  options: HistoryNavOptions,
): void {
  const { selectedIndex, totalItems, onNavigate, onSelect } = options;

  if (key.downArrow === true) {
    const next = Math.min(selectedIndex + 1, totalItems - 1);
    if (next !== selectedIndex) {
      onNavigate(next);
    }
    return;
  }

  if (key.upArrow === true) {
    const prev = Math.max(selectedIndex - 1, 0);
    if (prev !== selectedIndex) {
      onNavigate(prev);
    }
    return;
  }

  if (key.return === true) {
    if (totalItems > 0) {
      onSelect(selectedIndex);
    }
    return;
  }
}
