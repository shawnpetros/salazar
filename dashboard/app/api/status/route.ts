import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getAllKeys } from "@/lib/keys";
import type { DashboardState } from "@/lib/types";
import { EMPTY_STATE } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  console.log("[status] Fetching current session state");

  try {
    const sessionId = await redis.get<string>("session:current");

    if (!sessionId) {
      console.log("[status] No active session");
      return NextResponse.json(EMPTY_STATE);
    }

    const keys = getAllKeys(sessionId);
    const values = await redis.mget(...keys);
    const [status, features, sprint, commits, evaluator, cost] = values;

    const state: DashboardState = {
      sessionId,
      status: status as DashboardState["status"],
      features: features as DashboardState["features"],
      sprint: sprint as DashboardState["sprint"],
      commits: commits as DashboardState["commits"],
      evaluator: evaluator as DashboardState["evaluator"],
      cost: cost as DashboardState["cost"],
    };

    console.log(`[status] Returning state for session=${sessionId}`);
    return NextResponse.json(state);
  } catch (err) {
    console.error("[status] Redis error:", err);
    // Return empty state on error so dashboard degrades gracefully
    return NextResponse.json(EMPTY_STATE);
  }
}
