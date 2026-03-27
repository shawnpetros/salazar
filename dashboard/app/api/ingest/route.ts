import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { buildKey, TYPES } from "@/lib/keys";
import type { CommitEntry } from "@/lib/types";

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
    if (type === "commits") {
      // Prepend to array, cap at 20
      const existing = await redis.get<CommitEntry[]>(key);
      const commits = existing ?? [];
      const incoming = payload as CommitEntry;
      commits.unshift(incoming);
      const capped = commits.slice(0, 20);
      await redis.set(key, capped, { ex: TTL });
    } else {
      await redis.set(key, payload, { ex: TTL });
    }

    // Always update the current session pointer
    await redis.set("session:current", sessionId, { ex: TTL });

    console.log(`[ingest] type=${type} session=${sessionId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[ingest] Redis error for type=${type} session=${sessionId}:`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
