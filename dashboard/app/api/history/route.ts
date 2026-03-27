import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import type { SessionSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  console.log("[history] Fetching session history");

  try {
    const history = await redis.get<SessionSummary[]>("session:history");
    const items = history ?? [];

    // Return newest first
    const sorted = [...items].reverse();

    console.log(`[history] Returning ${sorted.length} sessions`);
    return NextResponse.json({ sessions: sorted });
  } catch (err) {
    console.error("[history] Redis error:", err);
    return NextResponse.json({ sessions: [] });
  }
}
