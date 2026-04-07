import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Feature, ProgressReport } from "../lib/types.js";

export function readProgress(workDir: string): ProgressReport | null {
  const path = join(workDir, "feature_list.json");
  if (!existsSync(path)) return null;
  const data = JSON.parse(readFileSync(path, "utf-8"));
  const items: Feature[] = Array.isArray(data) ? data : data.features ?? [];
  const passing = items.filter(f => f.passes).length;
  return {
    total: items.length,
    passing,
    items,
    percent: items.length > 0 ? (passing / items.length) * 100 : 0,
    isComplete: passing === items.length && items.length > 0,
  };
}

export function nextIncomplete(report: ProgressReport): Feature | null {
  return report.items.find(f => !f.passes) ?? null;
}

export function formatProgressHeader(report: ProgressReport): string {
  return `Progress: ${report.passing}/${report.total} features passing (${report.percent.toFixed(0)}%)\n`;
}
