import { Badge } from "@/components/badge";
import type { ReviewReadinessResult } from "@/lib/review-readiness";

import { NextActionCard } from "./next-action-card";
import { ReadinessBucketList } from "./readiness-bucket-list";

type ReviewSidebarProps = {
  eyebrow?: string;
  title?: string;
  readiness: ReviewReadinessResult;
};

export function ReviewSidebar({
  eyebrow = "Review",
  title = "Review readiness",
  readiness
}: ReviewSidebarProps) {
  return (
    <aside className="space-y-4">
      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
            <h3 className="mt-3 font-display text-2xl text-ink">{title}</h3>
          </div>
          <Badge tone={readiness.readyForWorkflow ? "success" : "warn"}>{readiness.statusLabel}</Badge>
        </div>
      </section>

      <NextActionCard body={readiness.nextAction} />
      <ReadinessBucketList buckets={readiness.buckets} />
    </aside>
  );
}
