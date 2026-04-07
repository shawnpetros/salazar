import { describe, it, expect } from "vitest";
import { bashSecurityHook } from "../security.js";

describe("bashSecurityHook", () => {
  it("allows listed commands", async () => {
    const r = await bashSecurityHook({ input: { command: "npm run test" } });
    expect(r.decision).toBe("allow");
  });

  it("denies unlisted commands", async () => {
    const r = await bashSecurityHook({ input: { command: "sudo rm -rf /" } });
    expect(r.decision).toBe("deny");
  });

  it("handles piped commands", async () => {
    const r = await bashSecurityHook({ input: { command: "cat file.txt | grep pattern" } });
    expect(r.decision).toBe("allow");
  });

  it("denies empty commands", async () => {
    const r = await bashSecurityHook({ input: { command: "" } });
    expect(r.decision).toBe("deny");
  });

  it("handles commands with env vars", async () => {
    const r = await bashSecurityHook({ input: { command: "NODE_ENV=test npm test" } });
    expect(r.decision).toBe("allow");
  });

  it("handles commands with paths", async () => {
    const r = await bashSecurityHook({ input: { command: "/usr/bin/node script.js" } });
    expect(r.decision).toBe("allow");
  });
});
