"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SprintData } from "@/lib/types";

export function SprintInfo({ data }: { data: SprintData | null }) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sprint</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No sprint data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sprint</span>
          <Badge variant="outline" className="font-[family-name:var(--font-geist-mono)] text-xs">
            Iteration {data.iteration}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Phase:</span>
            <Badge variant="secondary" className="text-xs">
              {data.phase}
            </Badge>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Feature:</span>
            <span className="text-sm font-medium">{data.featureName}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Goal:</span>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.goal}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
