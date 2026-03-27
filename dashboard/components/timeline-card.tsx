"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SessionStatus } from "@/lib/types";

interface TimelineEvent {
  timestamp: string;
  label: string;
  duration?: number; // ms since previous event
}

// Reconstruct timeline from status updates pushed to a new Redis key
export function TimelineCard({
  data,
  events,
}: {
  data: SessionStatus | null;
  events: TimelineEvent[] | null;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const startedAt = data?.startedAt ? new Date(data.startedAt).getTime() : null;
  const totalElapsed = startedAt ? now - startedAt : 0;

  // Current feature timer
  const currentFeatureStart = events?.length
    ? new Date(events[events.length - 1].timestamp).getTime()
    : startedAt;
  const featureElapsed = currentFeatureStart ? now - currentFeatureStart : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground/80">Timeline</CardTitle>
          {startedAt && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#89b4fa]" />
                <span className="text-[11px] font-mono text-muted-foreground/80">
                  total {formatDuration(totalElapsed)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f5c2e7] animate-pulse" />
                <span className="text-[11px] font-mono text-muted-foreground/80">
                  current {formatDuration(featureElapsed)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!events || events.length === 0 ? (
          <p className="text-sm text-muted-foreground/70">No timeline events</p>
        ) : (
          <ScrollArea className="h-40">
            <div className="flex flex-col gap-0.5">
              {events.map((event, i) => {
                const elapsed = startedAt
                  ? new Date(event.timestamp).getTime() - startedAt
                  : 0;
                return (
                  <div
                    key={`${event.timestamp}-${i}`}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/20 transition-colors"
                  >
                    {/* Timestamp column */}
                    <span className="text-[11px] font-mono tabular-nums text-[#89b4fa] w-16 shrink-0">
                      +{formatDuration(elapsed)}
                    </span>

                    {/* Duration badge */}
                    {event.duration != null && event.duration > 0 && (
                      <span className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded shrink-0 ${
                        event.duration > 600000
                          ? "bg-[#f38ba8]/10 text-[#f38ba8]"
                          : event.duration > 300000
                            ? "bg-[#f9e2af]/10 text-[#f9e2af]"
                            : "bg-[#a6e3a1]/10 text-[#a6e3a1]"
                      }`}>
                        {formatDuration(event.duration)}
                      </span>
                    )}

                    {/* Label */}
                    <span className="text-[13px] text-foreground/80 truncate">
                      {event.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* ETA estimate */}
        {events && events.length >= 2 && startedAt && (
          <div className="border-t border-border/30 mt-3 pt-3">
            <EstimateRow events={events} totalElapsed={totalElapsed} data={data} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EstimateRow({
  events,
  totalElapsed,
  data,
}: {
  events: TimelineEvent[];
  totalElapsed: number;
  data: SessionStatus | null;
}) {
  // Count completed features from events
  const completedFeatures = events.filter((e) => e.label.startsWith("F") && e.label.includes("passed")).length;
  if (completedFeatures === 0) return null;

  const avgPerFeature = totalElapsed / completedFeatures;
  // We don't know total features from here, but we can show avg
  return (
    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/70">
      <span>avg {formatDuration(avgPerFeature)}/feature</span>
      <span>{completedFeatures} completed</span>
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m${seconds > 0 ? ` ${String(seconds).padStart(2, "0")}s` : ""}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;
}
