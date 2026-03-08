import Link from "next/link";

import { Badge } from "@/components/badge";

type Row = {
  user: { id: string; name: string; email: string; linkedTeam: { name: string } | null };
  projects: Array<{ id: string; title: string; submissionStatus: string; updatedAt: Date }>;
  proposals: Array<{ id: string; title: string; status: string; updatedAt: Date }>;
  totalWork: number;
  hasNoActivity: boolean;
  lastActivity: Date | null;
};

type Milestone = {
  id: string;
  label: string;
  targetDate: Date;
};

type Props = {
  rows: Row[];
  milestones: Milestone[];
};

function projectStatusTone(status: string): "success" | "warn" | undefined {
  if (["SUBMITTED", "APPROVED"].includes(status)) return "success";
  if (status === "REVISION_REQUIRED") return "warn";
  return undefined;
}

function proposalStatusTone(status: string): "success" | "warn" | undefined {
  if (["APPROVED_FOR_INTERNAL_PUBLICATION", "ENACTED"].includes(status)) return "success";
  if (["REVISION_REQUESTED", "REJECTED"].includes(status)) return "warn";
  return undefined;
}

function formatRelativeDate(date: Date | null): string {
  if (!date) return "No activity";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CohortProgressTable({ rows, milestones }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink/50">No members yet. Add students from the roster section above.</p>
    );
  }

  const upcomingMilestone = milestones.find((m) => new Date(m.targetDate) >= new Date());

  return (
    <div className="space-y-4">
      {upcomingMilestone && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <p className="text-sm font-medium text-ink">
            Next milestone:{" "}
            <span className="text-accent">{upcomingMilestone.label}</span>
            {" — "}
            {new Date(upcomingMilestone.targetDate).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric"
            })}
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">Student</th>
              <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">Team</th>
              <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">Projects</th>
              <th className="pb-2 pr-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">Proposals</th>
              <th className="pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.user.id} className={row.hasNoActivity ? "opacity-50" : undefined}>
                <td className="py-3 pr-4">
                  <p className="font-medium text-ink">{row.user.name}</p>
                  <p className="text-xs text-ink/50">{row.user.email}</p>
                </td>
                <td className="py-3 pr-4 text-sm text-ink/60">
                  {row.user.linkedTeam?.name ?? "—"}
                </td>
                <td className="py-3 pr-4">
                  {row.projects.length === 0 ? (
                    <span className="text-ink/40">None</span>
                  ) : (
                    <div className="space-y-1">
                      {row.projects.map((p) => (
                        <div key={p.id} className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/projects/${p.id}`}
                            className="text-accent hover:underline line-clamp-1 max-w-32"
                          >
                            {p.title}
                          </Link>
                          <Badge tone={projectStatusTone(p.submissionStatus)}>
                            {p.submissionStatus.replace(/_/g, " ").toLowerCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {row.proposals.length === 0 ? (
                    <span className="text-ink/40">None</span>
                  ) : (
                    <div className="space-y-1">
                      {row.proposals.map((p) => (
                        <div key={p.id} className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/proposals/${p.id}`}
                            className="text-accent hover:underline line-clamp-1 max-w-32"
                          >
                            {p.title}
                          </Link>
                          <Badge tone={proposalStatusTone(p.status)}>
                            {p.status.replace(/_/g, " ").toLowerCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 text-xs text-ink/50">
                  {formatRelativeDate(row.lastActivity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 pt-2 text-xs text-ink/50">
        <span>{rows.filter((r) => !r.hasNoActivity).length} / {rows.length} students have submitted work</span>
        <span>{rows.reduce((sum, r) => sum + r.projects.length, 0)} total projects</span>
        <span>{rows.reduce((sum, r) => sum + r.proposals.length, 0)} total proposals</span>
      </div>
    </div>
  );
}
