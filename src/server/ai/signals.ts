import { ProjectCampaignEventKind, ProjectMilestoneKey } from "@prisma/client";

import { teamPulseResponseSchema, type TeamPulseResponse } from "@/server/ai/types";

export const STALL_THRESHOLD_DAYS = 3;

function daysBetween(left: Date, right: Date) {
  return Math.floor((left.getTime() - right.getTime()) / (1000 * 60 * 60 * 24));
}

type ProjectSignalContext = {
  createdBy: { id: string; name: string };
  collaborators: Array<{ user: { id: string; name: string } }>;
  campaignEvents: Array<{
    kind: ProjectCampaignEventKind;
    milestoneKey: ProjectMilestoneKey | null;
    actorUserId: string | null;
    createdAt: Date;
  }>;
  revisions: Array<{
    createdByUserId: string;
    createdAt: Date;
  }>;
};

export function getLatestHumanProgressAt(
  project: Pick<ProjectSignalContext, "campaignEvents">,
  milestoneKey: ProjectMilestoneKey | null
) {
  return (
    project.campaignEvents
      .filter(
        (event) =>
          event.kind === ProjectCampaignEventKind.PROGRESS_UPDATE &&
          event.actorUserId &&
          (!milestoneKey || event.milestoneKey === milestoneKey)
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0]?.createdAt ?? null
  );
}

export function isProjectStalled(params: {
  project: Pick<ProjectSignalContext, "campaignEvents">;
  milestoneKey: ProjectMilestoneKey | null;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const latest = getLatestHumanProgressAt(params.project, params.milestoneKey);

  if (!latest) {
    return {
      stalled: false,
      daysIdle: null as number | null,
      latestProgressAt: null as Date | null
    };
  }

  const daysIdle = daysBetween(now, latest);

  return {
    stalled: daysIdle >= STALL_THRESHOLD_DAYS,
    daysIdle,
    latestProgressAt: latest
  };
}

export function deriveTeamPulse(params: {
  project: ProjectSignalContext;
  activeMilestoneKey: ProjectMilestoneKey | null;
  now?: Date;
}): TeamPulseResponse {
  const now = params.now ?? new Date();
  const teamMembers = [
    { userId: params.project.createdBy.id, name: params.project.createdBy.name },
    ...params.project.collaborators.map((collaborator) => ({
      userId: collaborator.user.id,
      name: collaborator.user.name
    }))
  ].filter(
    (member, index, allMembers) =>
      allMembers.findIndex((candidate) => candidate.userId === member.userId) === index
  );

  const activityCounts = new Map<string, number>();

  for (const event of params.project.campaignEvents) {
    if (!event.actorUserId) {
      continue;
    }

    if (event.kind === ProjectCampaignEventKind.PROGRESS_UPDATE) {
      activityCounts.set(event.actorUserId, (activityCounts.get(event.actorUserId) ?? 0) + 1);
    }
  }

  for (const revision of params.project.revisions) {
    activityCounts.set(revision.createdByUserId, (activityCounts.get(revision.createdByUserId) ?? 0) + 1);
  }

  const totalActivity = Array.from(activityCounts.values()).reduce((sum, value) => sum + value, 0);
  const contributions = teamMembers.map((member) => {
    const activityCount = activityCounts.get(member.userId) ?? 0;

    return {
      userId: member.userId,
      name: member.name,
      activityCount,
      share: totalActivity > 0 ? activityCount / totalActivity : 0
    };
  });

  const topContributor = [...contributions].sort((left, right) => right.share - left.share)[0] ?? null;
  const quietMembers = contributions.filter((member) => member.activityCount === 0);
  const stale = isProjectStalled({
    project: params.project,
    milestoneKey: params.activeMilestoneKey,
    now
  });

  const findings: string[] = [];
  let status: TeamPulseResponse["status"] = "healthy";
  let prompt =
    "Keep the team aligned around one claim, one evidence trail, and one next move before the build sprint gets bigger.";

  if (quietMembers.length > 0 && teamMembers.length > 1) {
    status = "watch";
    findings.push(
      `${quietMembers.map((member) => member.name).join(", ")} has not logged project progress yet.`
    );
    prompt =
      "Pause and assign one visible next contribution to every teammate before you keep building.";
  }

  if (topContributor && topContributor.share >= 0.7 && teamMembers.length > 1) {
    status = "risk";
    findings.push(
      `${topContributor.name} is carrying ${Math.round(topContributor.share * 100)}% of the logged project activity.`
    );
    prompt =
      "One person is carrying too much of the project. Reassign the next milestone tasks so every teammate owns a visible piece of the work.";
  }

  if (stale.stalled) {
    status = "risk";
    findings.push(
      `The team has not logged human progress on the active milestone for ${stale.daysIdle} day${stale.daysIdle === 1 ? "" : "s"}.`
    );
    prompt =
      "Your team is stalled on the current milestone. Meet, name the blocker plainly, and decide the single next task each person will finish before the next session.";
  }

  if (findings.length === 0) {
    findings.push("Team activity is balanced enough to keep the current milestone moving.");
  }

  return teamPulseResponseSchema.parse({
    status,
    prompt,
    findings,
    contributions,
    unresolved: status !== "healthy"
  });
}
