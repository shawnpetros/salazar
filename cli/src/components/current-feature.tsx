/**
 * CurrentFeatureDisplay component — shows the currently-executing feature's
 * id, name, and active phase within the progress view.
 *
 * Renders two lines:
 *  1. `Current: F008 — ES256 key pair generation via Web Crypto`
 *  2. `Phase: generate → validate → evaluate`  (active phase is bold/highlighted)
 *
 * @example
 * ```
 * Current: F008 — ES256 key pair generation via Web Crypto
 * Phase: generate → validate → evaluate
 * ```
 */

import React from "react";
import { Box, Text } from "ink";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The ordered set of phases every feature passes through. */
export const FEATURE_PHASES = ["generate", "validate", "evaluate"] as const;

/** Arrow separator used between phase names in the pipeline display. */
const PHASE_ARROW = " \u2192 "; // " → "

/** Em dash separator used between the feature id and name. */
const EM_DASH = " \u2014 "; // " — "

/** Suffix appended to all feature names indicating the cryptographic runtime. */
const WEB_CRYPTO_SUFFIX = " via Web Crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One of the lifecycle phases a feature goes through. */
export type Phase = (typeof FEATURE_PHASES)[number];

/**
 * State describing the currently-executing feature.
 *
 * Passed directly to {@link CurrentFeatureDisplay} as the `currentFeature` prop.
 */
export interface CurrentFeatureState {
  /**
   * Short feature identifier (e.g. `'F008'`).
   * @example 'F008'
   */
  id: string;

  /**
   * Human-readable feature name (e.g. `'ES256 key pair generation'`).
   * @example 'ES256 key pair generation'
   */
  name: string;

  /**
   * The lifecycle phase currently executing.
   * @example 'generate'
   */
  phase: Phase;
}

/** Props accepted by the {@link CurrentFeatureDisplay} component. */
export interface CurrentFeatureDisplayProps {
  /**
   * The currently-executing feature state to display.
   */
  currentFeature: CurrentFeatureState;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render the first display line for a current feature state as a plain string.
 *
 * Formats: `'Current: {id} — {name} via Web Crypto'`
 *
 * @param state - The current feature state.
 * @returns Formatted header line string.
 *
 * @example
 * ```ts
 * renderCurrentFeatureLine({ id: 'F008', name: 'ES256 key pair generation', phase: 'generate' })
 * // → 'Current: F008 — ES256 key pair generation via Web Crypto'
 * ```
 */
export function renderCurrentFeatureLine(state: CurrentFeatureState): string {
  return `Current: ${state.id}${EM_DASH}${state.name}${WEB_CRYPTO_SUFFIX}`;
}

/**
 * Render the phase pipeline line as a plain string (no highlighting).
 *
 * Always renders all phases in order, separated by ` → `.
 * Formats: `'Phase: generate → validate → evaluate'`
 *
 * @returns Formatted phase pipeline string.
 *
 * @example
 * ```ts
 * renderPhaseLine()
 * // → 'Phase: generate → validate → evaluate'
 * ```
 */
export function renderPhaseLine(): string {
  return `Phase: ${FEATURE_PHASES.join(PHASE_ARROW)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CurrentFeatureDisplay component for the harness CLI run view.
 *
 * Renders the currently-executing feature with:
 *  - Line 1: Feature id and name with the "via Web Crypto" qualifier.
 *  - Line 2: The phase pipeline (`generate → validate → evaluate`) with the
 *    active phase rendered **bold** to highlight it.
 *
 * @param props - {@link CurrentFeatureDisplayProps}
 * @returns A React element containing both display lines.
 *
 * @example
 * ```tsx
 * import { render } from 'ink';
 * import { CurrentFeatureDisplay } from './components/current-feature.js';
 *
 * render(
 *   <CurrentFeatureDisplay
 *     currentFeature={{ id: 'F008', name: 'ES256 key pair generation', phase: 'generate' }}
 *   />
 * );
 * // Output:
 * // Current: F008 — ES256 key pair generation via Web Crypto
 * // Phase: generate → validate → evaluate
 * ```
 */
export function CurrentFeatureDisplay({
  currentFeature,
}: CurrentFeatureDisplayProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text>{renderCurrentFeatureLine(currentFeature)}</Text>
      <Box>
        <Text>Phase: </Text>
        {FEATURE_PHASES.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && <Text>{PHASE_ARROW}</Text>}
            <Text bold={p === currentFeature.phase}>{p}</Text>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}
