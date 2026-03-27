import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { buildKey, TYPES } from "@/lib/keys";
import type { CommitEntry, SessionSummary, FeaturesData, CostData, EvaluatorData, SpecData, SessionStatus } from "@/lib/types";

const TTL = 86400; // 24 hours

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.INGEST_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    console.error("[ingest] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { sessionId: string; type: string; payload: unknown };
  try {
    body = await request.json();
  } catch {
    console.error("[ingest] Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionId, type, payload } = body;

  if (!sessionId || !type || payload === undefined) {
    console.error("[ingest] Missing required fields");
    return NextResponse.json({ error: "Missing sessionId, type, or payload" }, { status: 400 });
  }

  if (!TYPES.includes(type as (typeof TYPES)[number])) {
    console.error(`[ingest] Invalid type=${type}`);
    return NextResponse.json({ error: `Invalid type: ${type}` }, { status: 400 });
  }

  const key = buildKey(sessionId, type);

  try {
    if (type === "commits" || type === "timeline") {
      // Append to array, cap at 50 for timeline, 20 for commits
      const cap = type === "timeline" ? 50 : 20;
      const existing = await redis.get<unknown[]>(key);
      const arr = existing ?? [];
      arr.push(payload);
      const capped = arr.slice(-cap);
      await redis.set(key, capped, { ex: TTL });
    } else {
      await redis.set(key, payload, { ex: TTL });
    }

    // Always update the current session pointer
    await redis.set("session:current", sessionId, { ex: TTL });

    // Capture session history when a session completes
    if (type === "status" && (payload as SessionStatus).state === "complete") {
      try {
        const results = await redis.mget(
          buildKey(sessionId, "features"),
          buildKey(sessionId, "cost"),
          buildKey(sessionId, "evaluator"),
          buildKey(sessionId, "spec"),
          buildKey(sessionId, "status"),
        );

        const featuresRaw = results[0] as FeaturesData | null;
        const costRaw = results[1] as CostData | null;
        const evaluatorRaw = results[2] as EvaluatorData | null;
        const specRaw = results[3] as SpecData | null;
        const statusRaw = results[4] as SessionStatus | null;

        const startMs = statusRaw?.startedAt ? new Date(statusRaw.startedAt).getTime() : 0;
        const totalTimeMs = startMs > 0 ? Date.now() - startMs : 0;

        const summary: SessionSummary = {
          sessionId,
          completedAt: new Date().toISOString(),
          specName: specRaw?.name ?? null,
          featuresTotal: featuresRaw?.total ?? 0,
          featuresPassing: featuresRaw?.passing ?? 0,
          totalCost: costRaw?.estimatedCost ?? 0,
          totalTimeMs,
          avgEvaluatorScore: evaluatorRaw?.lastScore ?? null,
        };

        const historyKey = "session:history";
        const existing = await redis.get<SessionSummary[]>(historyKey);
        const history = existing ?? [];
        history.push(summary);
        const capped = history.slice(-50);
        await redis.set(historyKey, capped);

        console.log(`[ingest] Session history captured for session=${sessionId}`);
      } catch (histErr) {
        console.error(`[ingest] Failed to capture session history for session=${sessionId}:`, histErr);
      }
    }

    console.log(`[ingest] type=${type} session=${sessionId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[ingest] Redis error for type=${type} session=${sessionId}:`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
