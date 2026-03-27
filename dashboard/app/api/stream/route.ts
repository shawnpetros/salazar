import { redis } from "@/lib/redis";
import { getAllKeys } from "@/lib/keys";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      console.log("[stream] SSE connection opened");

      const startTime = Date.now();
      const MAX_DURATION = 55_000; // 55 seconds
      const POLL_INTERVAL = 1_500;
      const HEARTBEAT_INTERVAL = 15_000;

      let lastDataHash = "";
      let lastHeartbeat = Date.now();

      const poll = async () => {
        if (closed) return;

        const elapsed = Date.now() - startTime;
        if (elapsed >= MAX_DURATION) {
          console.log("[stream] Max duration reached, closing");
          controller.close();
          closed = true;
          return;
        }

        try {
          const sessionId = await redis.get<string>("session:current");

          if (!sessionId) {
            // Send empty state
            const data = JSON.stringify({ sessionId: null });
            const hash = data;
            if (hash !== lastDataHash) {
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              lastDataHash = hash;
              lastHeartbeat = Date.now();
            }
          } else {
            const keys = getAllKeys(sessionId);
            const values = await redis.mget(...keys);
            const [status, features, sprint, commits, evaluator, cost, timeline, spec] = values;

            const data = JSON.stringify({
              sessionId,
              status: status ?? null,
              features: features ?? null,
              sprint: sprint ?? null,
              commits: commits ?? null,
              evaluator: evaluator ?? null,
              cost: cost ?? null,
              timeline: timeline ?? null,
              spec: spec ?? null,
            });

            const hash = data;
            if (hash !== lastDataHash) {
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              lastDataHash = hash;
              lastHeartbeat = Date.now();
            }
          }

          // Heartbeat if no data sent recently
          if (Date.now() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
            controller.enqueue(encoder.encode(":\n\n"));
            lastHeartbeat = Date.now();
          }
        } catch (err) {
          console.error("[stream] Poll error:", err);
        }

        if (!closed) {
          setTimeout(poll, POLL_INTERVAL);
        }
      };

      poll();
    },
    cancel() {
      console.log("[stream] SSE connection closed by client");
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
