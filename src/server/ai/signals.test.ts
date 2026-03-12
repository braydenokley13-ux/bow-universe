import { ProjectCampaignEventKind, ProjectMilestoneKey } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { STALL_THRESHOLD_DAYS, deriveTeamPulse, isProjectStalled } from "@/server/ai/signals";

describe("AI campaign signals", () => {
  it("flags a project as stalled after the configured number of idle days", () => {
    const now = new Date("2026-03-12T12:00:00.000Z");
    const latestProgressAt = new Date("2026-03-09T08:00:00.000Z");

    const stalled = isProjectStalled({
      project: {
        campaignEvents: [
          {
            kind: ProjectCampaignEventKind.PROGRESS_UPDATE,
            milestoneKey: ProjectMilestoneKey.EVIDENCE_BOARD,
            actorUserId: "student-1",
            createdAt: latestProgressAt
          }
        ]
      },
      milestoneKey: ProjectMilestoneKey.EVIDENCE_BOARD,
      now
    });

    expect(stalled.stalled).toBe(true);
    expect(stalled.daysIdle).toBe(STALL_THRESHOLD_DAYS);
    expect(stalled.latestProgressAt).toEqual(latestProgressAt);
  });

  it("marks the team pulse as risky when one teammate carries most of the visible work", () => {
    const pulse = deriveTeamPulse({
      project: {
        createdBy: {
          id: "student-1",
          name: "Alex"
        },
        collaborators: [
          {
            user: {
              id: "student-2",
              name: "Bri"
            }
          }
        ],
        campaignEvents: [
          {
            kind: ProjectCampaignEventKind.PROGRESS_UPDATE,
            milestoneKey: ProjectMilestoneKey.BUILD_SPRINT,
            actorUserId: "student-1",
            createdAt: new Date("2026-03-11T10:00:00.000Z")
          },
          {
            kind: ProjectCampaignEventKind.PROGRESS_UPDATE,
            milestoneKey: ProjectMilestoneKey.BUILD_SPRINT,
            actorUserId: "student-1",
            createdAt: new Date("2026-03-11T11:00:00.000Z")
          },
          {
            kind: ProjectCampaignEventKind.PROGRESS_UPDATE,
            milestoneKey: ProjectMilestoneKey.BUILD_SPRINT,
            actorUserId: "student-1",
            createdAt: new Date("2026-03-11T12:00:00.000Z")
          },
          {
            kind: ProjectCampaignEventKind.PROGRESS_UPDATE,
            milestoneKey: ProjectMilestoneKey.BUILD_SPRINT,
            actorUserId: "student-2",
            createdAt: new Date("2026-03-11T13:00:00.000Z")
          }
        ],
        revisions: []
      },
      activeMilestoneKey: ProjectMilestoneKey.BUILD_SPRINT,
      now: new Date("2026-03-12T12:00:00.000Z")
    });

    expect(pulse.status).toBe("risk");
    expect(pulse.unresolved).toBe(true);
    expect(pulse.prompt).toContain("One person is carrying too much");
  });
});
