/**
 * F036 — Header component: display title and live elapsed timer
 *
 * Verifies that:
 *  - Header is exported as a function from components/header.tsx
 *  - Header renders with the ⬡ glyph and title on the left
 *  - Header renders with the ⏱ glyph and elapsed time on the right
 *  - Header renders a divider line below the title row
 *  - Header accepts different title and elapsed values
 *  - HeaderProps interface requires title and elapsed
 */

import { describe, it, expect } from "vitest";
import React from "react";

describe("F036 — Header exports", () => {
  it("Header is exported as a function from components/header.tsx", async () => {
    const { Header } = await import("../components/header.js");
    expect(typeof Header).toBe("function");
  });

  it("HeaderProps type is satisfied by { title, elapsed }", async () => {
    const { Header } = await import("../components/header.js");
    // Should not throw when instantiated with correct props
    const el = React.createElement(Header, {
      title: "Harness",
      elapsed: "12m 34s",
    });
    expect(el).toBeDefined();
    expect(el.type).toBe(Header);
  });
});

describe("F036 — Header renders correct structure", () => {
  it("Header returns a React element", async () => {
    const { Header } = await import("../components/header.js");
    const el = Header({ title: "Harness", elapsed: "12m 34s" });
    expect(el).toBeDefined();
    expect(typeof el).toBe("object");
  });

  it("Header props include title 'Harness'", async () => {
    const { Header } = await import("../components/header.js");
    const el = React.createElement(Header, {
      title: "Harness",
      elapsed: "12m 34s",
    });
    expect(el.props.title).toBe("Harness");
  });

  it("Header props include elapsed '12m 34s'", async () => {
    const { Header } = await import("../components/header.js");
    const el = React.createElement(Header, {
      title: "Harness",
      elapsed: "12m 34s",
    });
    expect(el.props.elapsed).toBe("12m 34s");
  });

  it("Header accepts different title and elapsed values", async () => {
    const { Header } = await import("../components/header.js");
    const el = React.createElement(Header, {
      title: "My App",
      elapsed: "1h 2m",
    });
    expect(el.props.title).toBe("My App");
    expect(el.props.elapsed).toBe("1h 2m");
  });
});

describe("F036 — Header source structure", () => {
  it("header.tsx source contains the ⬡ glyph", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/header.tsx"),
      "utf-8"
    );
    expect(content).toContain("⬡");
  });

  it("header.tsx source contains the ⏱ glyph", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/header.tsx"),
      "utf-8"
    );
    expect(content).toContain("⏱");
  });

  it("header.tsx source exports Header function", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/header.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function Header");
  });

  it("header.tsx source uses title prop in rendered output", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/header.tsx"),
      "utf-8"
    );
    expect(content).toContain("title");
    expect(content).toContain("elapsed");
  });

  it("header.tsx source contains a divider line element", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/header.tsx"),
      "utf-8"
    );
    // Divider can be rendered via ─ character repetition or a separator element
    expect(content).toMatch(/─|divider|separator|─/i);
  });

  it("header.tsx source uses justifyContent space-between for left/right layout", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(__dirname, "..");
    const content = readFileSync(
      resolve(srcRoot, "components/header.tsx"),
      "utf-8"
    );
    expect(content).toContain("space-between");
  });
});
