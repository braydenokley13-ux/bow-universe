import Link from "next/link";

import { Badge } from "@/components/badge";

type ChronicleArticleCardProps = {
  id: string;
  headline: string;
  body: string;
  category: string;
  seasonYear?: number | null;
  teamName?: string | null;
  teamId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  publishedAt: Date;
  compact?: boolean;
};

function categoryTone(category: string): "default" | "success" | "warn" | "danger" {
  switch (category) {
    case "proposal_approved":
      return "success";
    case "issue_triggered":
      return "warn";
    case "milestone":
      return "danger";
    default:
      return "default";
  }
}

function categoryLabel(category: string) {
  switch (category) {
    case "season_advance":
      return "Season report";
    case "proposal_approved":
      return "Rule change";
    case "issue_triggered":
      return "League alert";
    case "milestone":
      return "Milestone";
    default:
      return category.replace(/_/g, " ");
  }
}

function entityHref(entityType: string | null | undefined, entityId: string | null | undefined) {
  if (!entityType || !entityId) return null;
  if (entityType === "Proposal") return `/proposals/${entityId}`;
  if (entityType === "Issue") return `/issues/${entityId}`;
  if (entityType === "Season") return "/";
  return null;
}

export function ChronicleArticleCard({
  headline,
  body,
  category,
  seasonYear,
  teamName,
  teamId,
  entityType,
  entityId,
  publishedAt,
  compact = false
}: ChronicleArticleCardProps) {
  const href = entityHref(entityType, entityId);

  return (
    <article className="rounded-2xl border border-line bg-white/60 p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Badge tone={categoryTone(category)}>{categoryLabel(category)}</Badge>
        <span className="font-mono text-xs text-ink/45">
          {new Date(publishedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          })}
        </span>
      </div>

      <div>
        {href ? (
          <Link href={href} className="hover:text-accent">
            <h3 className={`font-display text-ink ${compact ? "text-lg" : "text-xl"} leading-snug`}>
              {headline}
            </h3>
          </Link>
        ) : (
          <h3 className={`font-display text-ink ${compact ? "text-lg" : "text-xl"} leading-snug`}>
            {headline}
          </h3>
        )}
      </div>

      {!compact && (
        <p className="text-sm leading-6 text-ink/68">{body}</p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-ink/45">
        {seasonYear && <span>Season {seasonYear}</span>}
        {teamName && teamId && (
          <Link href={`/teams/${teamId}`} className="hover:text-accent">
            {teamName}
          </Link>
        )}
        {href && (
          <Link href={href} className="text-accent hover:underline">
            View details →
          </Link>
        )}
      </div>
    </article>
  );
}
