import {
  ProjectCampaignEventKind,
  Prisma,
  PrismaClient,
  ProjectMilestoneKey,
  ProjectMilestoneStatus,
  ProjectScale
} from "@prisma/client";

import type { ProjectCampaignAssessment } from "@/lib/project-campaign";

type ProjectCampaignDb = Pick<
  PrismaClient,
  "projectMilestone" | "projectDeliverable" | "projectCampaignEvent"
> &
  Partial<Pick<PrismaClient, "activityEvent">>;

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

async function createActivityMirror(
  db: ProjectCampaignDb,
  input: {
    type: string;
    title: string;
    summary: string;
    projectId: string;
  }
) {
  if (!db.activityEvent) {
    return;
  }

  await db.activityEvent.create({
    data: {
      type: input.type,
      title: input.title,
      summary: input.summary,
      entityType: "PROJECT",
      entityId: input.projectId
    }
  });
}

type SyncProjectCampaignParams = {
  db: ProjectCampaignDb;
  projectId: string;
  scale: ProjectScale;
  assessment: ProjectCampaignAssessment;
};

function eventExists(
  events: Array<{ kind: ProjectCampaignEventKind; milestoneKey: ProjectMilestoneKey | null; title: string }>,
  kind: ProjectCampaignEventKind,
  milestoneKey: ProjectMilestoneKey | null,
  title: string
) {
  return events.some((event) => event.kind === kind && event.milestoneKey === milestoneKey && event.title === title);
}

export async function syncProjectCampaignState({
  db,
  projectId,
  scale,
  assessment
}: SyncProjectCampaignParams) {
  if (scale !== ProjectScale.EXTENDED || !assessment.isExtended) {
    await Promise.all([
      db.projectMilestone.deleteMany({ where: { projectId } }),
      db.projectDeliverable.deleteMany({ where: { projectId } }),
      db.projectCampaignEvent.deleteMany({ where: { projectId } })
    ]);
    return;
  }

  const [existingMilestones, existingEvents] = await Promise.all([
    db.projectMilestone.findMany({
      where: { projectId }
    }),
    db.projectCampaignEvent.findMany({
      where: { projectId }
    })
  ]);

  const existingMilestonesByKey = new Map(existingMilestones.map((milestone) => [milestone.key, milestone]));

  for (const milestone of assessment.milestones) {
    const previous = existingMilestonesByKey.get(milestone.key);
    const completedAt =
      milestone.status === ProjectMilestoneStatus.COMPLETE
        ? previous?.completedAt ?? new Date()
        : null;

    await db.projectMilestone.upsert({
      where: {
        projectId_key: {
          projectId,
          key: milestone.key
        }
      },
      create: {
        projectId,
        key: milestone.key,
        title: milestone.title,
        status: milestone.status,
        targetDate: milestone.targetDate,
        completedAt,
        completionNote: milestone.completionNote
      },
      update: {
        title: milestone.title,
        status: milestone.status,
        targetDate: milestone.targetDate,
        completedAt,
        completionNote: milestone.completionNote
      }
    });

    if (
      milestone.status === ProjectMilestoneStatus.COMPLETE &&
      previous?.status !== ProjectMilestoneStatus.COMPLETE
    ) {
      const title = `Milestone cleared: ${milestone.title}`;
      if (!eventExists(existingEvents, ProjectCampaignEventKind.UNLOCK, milestone.key, title)) {
        await db.projectCampaignEvent.create({
          data: {
            projectId,
            kind: ProjectCampaignEventKind.UNLOCK,
            milestoneKey: milestone.key,
            title,
            body: `The project finished ${milestone.title.toLowerCase()} and opened the next push.`
          }
        });
        await createActivityMirror(db, {
          type: "PROJECT_CAMPAIGN_UNLOCK",
          title,
          summary: `The project cleared ${milestone.title.toLowerCase()} and opened the next stage.`,
          projectId
        });
      }
    }

    if (
      milestone.status === ProjectMilestoneStatus.ACTIVE &&
      previous?.status !== ProjectMilestoneStatus.ACTIVE
    ) {
      const title = `Unlocked ${milestone.title}`;
      if (!eventExists(existingEvents, ProjectCampaignEventKind.UNLOCK, milestone.key, title)) {
        await db.projectCampaignEvent.create({
          data: {
            projectId,
            kind: ProjectCampaignEventKind.UNLOCK,
            milestoneKey: milestone.key,
            title,
            body: `This part of the month-long campaign is live. Finish the exit criteria to keep the mission moving.`
          }
        });
        await createActivityMirror(db, {
          type: "PROJECT_CAMPAIGN_UNLOCK",
          title,
          summary: `${milestone.title} is now active for this month-long project.`,
          projectId
        });
      }
    }
  }

  for (const deliverable of assessment.deliverables) {
    const completedAt = deliverable.complete ? new Date() : null;

    await db.projectDeliverable.upsert({
      where: {
        projectId_key: {
          projectId,
          key: deliverable.key
        }
      },
      create: {
        projectId,
        key: deliverable.key,
        title: deliverable.title,
        required: true,
        complete: deliverable.complete,
        contentMd: deliverable.contentMd,
        artifactUrl: deliverable.artifactUrl,
        completedAt
      },
      update: {
        title: deliverable.title,
        required: true,
        complete: deliverable.complete,
        contentMd: deliverable.contentMd,
        artifactUrl: deliverable.artifactUrl,
        completedAt
      }
    });
  }

  if (assessment.launchReady) {
    const title = "Launch week ready";
    if (!eventExists(existingEvents, ProjectCampaignEventKind.LAUNCH, ProjectMilestoneKey.LAUNCH_WEEK, title)) {
      await db.projectCampaignEvent.create({
        data: {
          projectId,
          kind: ProjectCampaignEventKind.LAUNCH,
          milestoneKey: ProjectMilestoneKey.LAUNCH_WEEK,
          title,
          body: "The full package is assembled. The project is ready for launch week review and presentation."
        }
      });
      await createActivityMirror(db, {
        type: "PROJECT_CAMPAIGN_LAUNCH",
        title,
        summary: "The month-long project has assembled its launch package and is ready for presentation.",
        projectId
      });
    }
  }
}

export async function createProjectCampaignFeedbackEvent(params: {
  db: ProjectCampaignDb;
  projectId: string;
  milestoneKey: ProjectMilestoneKey | null;
  body: string;
  actorUserId?: string | null;
}) {
  await params.db.projectCampaignEvent.create({
    data: {
      projectId: params.projectId,
      kind: ProjectCampaignEventKind.FEEDBACK,
      milestoneKey: params.milestoneKey,
      actorUserId: params.actorUserId ?? null,
      title: params.milestoneKey ? `Feedback on ${params.milestoneKey.toLowerCase().replaceAll("_", " ")}` : "Project feedback added",
      body: params.body
    }
  });

  await createActivityMirror(params.db, {
    type: "PROJECT_CAMPAIGN_FEEDBACK",
    title: params.milestoneKey
      ? `Feedback on ${params.milestoneKey.toLowerCase().replaceAll("_", " ")}`
      : "Project feedback added",
    summary: params.body,
    projectId: params.projectId
  });
}

export async function createProjectCampaignProgressEvent(params: {
  db: ProjectCampaignDb;
  projectId: string;
  milestoneKey: ProjectMilestoneKey | null;
  actorUserId: string;
  body: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const existingToday = await params.db.projectCampaignEvent.findMany({
    where: {
      projectId: params.projectId,
      kind: ProjectCampaignEventKind.PROGRESS_UPDATE,
      milestoneKey: params.milestoneKey,
      actorUserId: params.actorUserId,
      createdAt: {
        gte: startOfDay(now)
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 1
  });

  if (existingToday.length > 0) {
    return existingToday[0];
  }

  const title = params.milestoneKey
    ? `Progress update on ${params.milestoneKey.toLowerCase().replaceAll("_", " ")}`
    : "Project progress update";

  const event = await params.db.projectCampaignEvent.create({
    data: {
      projectId: params.projectId,
      kind: ProjectCampaignEventKind.PROGRESS_UPDATE,
      milestoneKey: params.milestoneKey,
      actorUserId: params.actorUserId,
      title,
      body: params.body
    }
  });

  await createActivityMirror(params.db, {
    type: "PROJECT_CAMPAIGN_PROGRESS",
    title,
    summary: params.body,
    projectId: params.projectId
  });

  return event;
}

export async function createProjectCampaignAiGuidanceEvent(params: {
  db: ProjectCampaignDb;
  projectId: string;
  milestoneKey: ProjectMilestoneKey | null;
  actorUserId?: string | null;
  title: string;
  body: string;
  metadata?: Prisma.InputJsonObject | null;
}) {
  const event = await params.db.projectCampaignEvent.create({
    data: {
      projectId: params.projectId,
      kind: ProjectCampaignEventKind.AI_GUIDANCE,
      milestoneKey: params.milestoneKey,
      actorUserId: params.actorUserId ?? null,
      title: params.title,
      body: params.body,
      metadataJson: params.metadata ?? undefined
    }
  });

  await createActivityMirror(params.db, {
    type: "PROJECT_CAMPAIGN_AI_GUIDANCE",
    title: params.title,
    summary: params.body,
    projectId: params.projectId
  });

  return event;
}

export async function createProjectCampaignTeamPulseEvent(params: {
  db: ProjectCampaignDb;
  projectId: string;
  milestoneKey: ProjectMilestoneKey | null;
  actorUserId?: string | null;
  title: string;
  body: string;
  metadata?: Prisma.InputJsonObject | null;
}) {
  const event = await params.db.projectCampaignEvent.create({
    data: {
      projectId: params.projectId,
      kind: ProjectCampaignEventKind.TEAM_PULSE,
      milestoneKey: params.milestoneKey,
      actorUserId: params.actorUserId ?? null,
      title: params.title,
      body: params.body,
      metadataJson: params.metadata ?? undefined
    }
  });

  await createActivityMirror(params.db, {
    type: "PROJECT_CAMPAIGN_TEAM_PULSE",
    title: params.title,
    summary: params.body,
    projectId: params.projectId
  });

  return event;
}

export async function createProjectCampaignStallEvent(params: {
  db: ProjectCampaignDb;
  projectId: string;
  milestoneKey: ProjectMilestoneKey | null;
  actorUserId?: string | null;
  title: string;
  body: string;
  metadata?: Prisma.InputJsonObject | null;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const existingToday = await params.db.projectCampaignEvent.findMany({
    where: {
      projectId: params.projectId,
      kind: ProjectCampaignEventKind.STALL_ALERT,
      milestoneKey: params.milestoneKey,
      createdAt: {
        gte: startOfDay(now)
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 1
  });

  if (existingToday.length > 0) {
    return existingToday[0];
  }

  const event = await params.db.projectCampaignEvent.create({
    data: {
      projectId: params.projectId,
      kind: ProjectCampaignEventKind.STALL_ALERT,
      milestoneKey: params.milestoneKey,
      actorUserId: params.actorUserId ?? null,
      title: params.title,
      body: params.body,
      metadataJson: params.metadata ?? undefined
    }
  });

  await createActivityMirror(params.db, {
    type: "PROJECT_CAMPAIGN_STALL_ALERT",
    title: params.title,
    summary: params.body,
    projectId: params.projectId
  });

  return event;
}
