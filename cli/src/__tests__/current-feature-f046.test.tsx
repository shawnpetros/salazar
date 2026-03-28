/**
 * F046 — Current feature display: show feature id, name, and active phase
 *
 * BDD scenario:
 *  Given a currentFeature state { id: 'F008', name: 'ES256 key pair generation', phase: 'generate' }
 *  When rendered inside the progress view
 *  Then it displays 'Current: F008 — ES256 key pair generation via Web Crypto'
 *  And 'Phase: generate → validate → evaluate' with the active phase highlighted
 *
 * Verifies that:
 *  - CurrentFeatureDisplay is exported as a function from components/current-feature.tsx
 *  - CurrentFeatureState interface is exported
 *  - CurrentFeatureDisplayProps interface is exported
 *  - Phase type is exported
 *  - FEATURE_PHASES constant is exported
 *  - renderCurrentFeatureLine is exported and formats correctly
 *  - renderPhaseLine is exported and formats correctly
 *  - renderCurrentFeatureLine returns the canonical BDD example string
 *  - renderPhaseLine returns 'Phase: generate → validate → evaluate'
 *  - CurrentFeatureDisplay accepts currentFeature prop
 *  - CurrentFeatureDisplay returns a React element
 *  - The em dash (—) is used in the feature line
 *  - The arrow (→) is used in the phase line
 *  - "via Web Crypto" is appended to the feature name
 *  - Active phase is highlighted (bold) in the component
 */

import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Export checks
// ---------------------------------------------------------------------------

describe("F046 — CurrentFeatureDisplay exports", () => {
  it("CurrentFeatureDisplay is exported as a function from components/current-feature.tsx", async () => {
    const { CurrentFeatureDisplay } = await import(
      "../components/current-feature.js"
    );
    expect(typeof CurrentFeatureDisplay).toBe("function");
  });

  it("renderCurrentFeatureLine is exported as a function", async () => {
    const { renderCurrentFeatureLine } = await import(
      "../components/current-feature.js"
    );
    expect(typeof renderCurrentFeatureLine).toBe("function");
  });

  it("renderPhaseLine is exported as a function", async () => {
    const { renderPhaseLine } = await import(
      "../components/current-feature.js"
    );
    expect(typeof renderPhaseLine).toBe("function");
  });

  it("FEATURE_PHASES is exported as an array", async () => {
    const { FEATURE_PHASES } = await import(
      "../components/current-feature.js"
    );
    expect(Array.isArray(FEATURE_PHASES)).toBe(true);
  });

  it("FEATURE_PHASES contains generate, validate, evaluate in order", async () => {
    const { FEATURE_PHASES } = await import(
      "../components/current-feature.js"
    );
    expect(FEATURE_PHASES[0]).toBe("generate");
    expect(FEATURE_PHASES[1]).toBe("validate");
    expect(FEATURE_PHASES[2]).toBe("evaluate");
    expect(FEATURE_PHASES).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// renderCurrentFeatureLine
// ---------------------------------------------------------------------------

describe("F046 — renderCurrentFeatureLine", () => {
  it("returns the canonical BDD example string", async () => {
    const { renderCurrentFeatureLine } = await import(
      "../components/current-feature.js"
    );
    const state = {
      id: "F008",
      name: "ES256 key pair generation",
      phase: "generate" as const,
    };
    expect(renderCurrentFeatureLine(state)).toBe(
      "Current: F008 \u2014 ES256 key pair generation via Web Crypto"
    );
  });

  it("contains the feature id", async () => {
    const { renderCurrentFeatureLine } = await import(
      "../components/current-feature.js"
    );
    const state = {
      id: "F008",
      name: "ES256 key pair generation",
      phase: "generate" as const,
    };
    expect(renderCurrentFeatureLine(state)).toContain("F008");
  });

  it("contains the feature name", async () => {
    const { renderCurrentFeatureLine } = await import(
      "../components/current-feature.js"
    );
    const state = {
      id: "F008",
      name: "ES256 key pair generation",
      phase: "generate" as const,
    };
    expect(renderCurrentFeatureLine(state)).toContain(
      "ES256 key pair generation"
    );
  });

  it("appends 'via Web Crypto' to the feature name", async () => {
    const { renderCurrentFeatureLine } = await import(
      "../components/current-feature.js"
    );
    const state = {
      id: "F008",
      name: "ES256 key pair generation",
      phase: "generate" as const,
    };
    expect(renderCurrentFeatureLine(state)).toContain("via Web Crypto");
  });

  it("uses em dash (—) between id and name", async () => {
    const { renderCurrentFeatureLine } = await import(
      "../components/current-feature.js"
    );
    const state = {
      id: "F008",
      name: "ES256 key pair generation",
      phase: "generate" as const,
    };
    // U+2014 em dash
    expect(renderCurrentFeatureLine(state)).toContain("\u2014");
  });

  it("starts with 'Current: '", async () => {
    const { renderCurrentFeatureLine } = await import(
      "../components/current-feature.js"
    );
    const state = {
      id: "F001",
      name: "Some feature",
      phase: "validate" as const,
    };
    expect(renderCurrentFeatureLine(state)).toMatch(/^Current: /);
  });

  it("works with different feature ids and names", async () => {
    const { renderCurrentFeatureLine } = await import(
      "../components/current-feature.js"
    );
    const state = {
      id: "F042",
      name: "JWT token signing",
      phase: "evaluate" as const,
    };
    const result = renderCurrentFeatureLine(state);
    expect(result).toContain("F042");
    expect(result).toContain("JWT token signing");
    expect(result).toContain("via Web Crypto");
  });
});

// ---------------------------------------------------------------------------
// renderPhaseLine
// ---------------------------------------------------------------------------

describe("F046 — renderPhaseLine", () => {
  it("returns 'Phase: generate → validate → evaluate'", async () => {
    const { renderPhaseLine } = await import(
      "../components/current-feature.js"
    );
    // U+2192 rightward arrow
    expect(renderPhaseLine()).toBe(
      "Phase: generate \u2192 validate \u2192 evaluate"
    );
  });

  it("starts with 'Phase: '", async () => {
    const { renderPhaseLine } = await import(
      "../components/current-feature.js"
    );
    expect(renderPhaseLine()).toMatch(/^Phase: /);
  });

  it("contains all three phases", async () => {
    const { renderPhaseLine } = await import(
      "../components/current-feature.js"
    );
    const result = renderPhaseLine();
    expect(result).toContain("generate");
    expect(result).toContain("validate");
    expect(result).toContain("evaluate");
  });

  it("uses the → (U+2192) arrow between phases", async () => {
    const { renderPhaseLine } = await import(
      "../components/current-feature.js"
    );
    expect(renderPhaseLine()).toContain("\u2192");
  });
});

// ---------------------------------------------------------------------------
// React element checks
// ---------------------------------------------------------------------------

describe("F046 — CurrentFeatureDisplay React element", () => {
  it("returns a React element when called directly", async () => {
    const { CurrentFeatureDisplay } = await import(
      "../components/current-feature.js"
    );
    const el = CurrentFeatureDisplay({
      currentFeature: {
        id: "F008",
        name: "ES256 key pair generation",
        phase: "generate",
      },
    });
    expect(el).toBeDefined();
    expect(typeof el).toBe("object");
  });

  it("React.createElement works with CurrentFeatureDisplay", async () => {
    const { CurrentFeatureDisplay } = await import(
      "../components/current-feature.js"
    );
    const props = {
      currentFeature: {
        id: "F008",
        name: "ES256 key pair generation",
        phase: "generate" as const,
      },
    };
    const el = React.createElement(CurrentFeatureDisplay, props);
    expect(el.type).toBe(CurrentFeatureDisplay);
    expect(el.props.currentFeature.id).toBe("F008");
    expect(el.props.currentFeature.name).toBe("ES256 key pair generation");
    expect(el.props.currentFeature.phase).toBe("generate");
  });

  it("accepts validate as an active phase", async () => {
    const { CurrentFeatureDisplay } = await import(
      "../components/current-feature.js"
    );
    const el = React.createElement(CurrentFeatureDisplay, {
      currentFeature: { id: "F001", name: "Some feature", phase: "validate" },
    });
    expect(el.props.currentFeature.phase).toBe("validate");
  });

  it("accepts evaluate as an active phase", async () => {
    const { CurrentFeatureDisplay } = await import(
      "../components/current-feature.js"
    );
    const el = React.createElement(CurrentFeatureDisplay, {
      currentFeature: { id: "F001", name: "Some feature", phase: "evaluate" },
    });
    expect(el.props.currentFeature.phase).toBe("evaluate");
  });
});

// ---------------------------------------------------------------------------
// Source-level assertions
// ---------------------------------------------------------------------------

describe("F046 — current-feature.tsx source structure", () => {
  it("exports CurrentFeatureDisplay function", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function CurrentFeatureDisplay");
  });

  it("exports renderCurrentFeatureLine function", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function renderCurrentFeatureLine");
  });

  it("exports renderPhaseLine function", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function renderPhaseLine");
  });

  it("exports CurrentFeatureState interface", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("export interface CurrentFeatureState");
  });

  it("exports CurrentFeatureDisplayProps interface", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("export interface CurrentFeatureDisplayProps");
  });

  it("exports FEATURE_PHASES constant", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("export const FEATURE_PHASES");
  });

  it("contains the em dash character (—) U+2014", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("\u2014");
  });

  it("contains the arrow character (→) U+2192", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("\u2192");
  });

  it("contains 'via Web Crypto'", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("via Web Crypto");
  });

  it("uses bold prop to highlight the active phase", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("bold");
  });

  it("contains generate, validate, and evaluate phase names", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("generate");
    expect(content).toContain("validate");
    expect(content).toContain("evaluate");
  });

  it("uses id and name fields from CurrentFeatureState", () => {
    const content = readFileSync(
      resolve(srcRoot, "components/current-feature.tsx"),
      "utf-8"
    );
    expect(content).toContain("id");
    expect(content).toContain("name");
    expect(content).toContain("phase");
  });
});
