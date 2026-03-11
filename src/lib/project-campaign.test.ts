import {
  ProjectArtifactFocus,
  ProjectDeliverableKey,
  ProjectMilestoneKey,
  ProjectMilestoneStatus,
  ProjectScale
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildDefaultProjectMilestones,
  buildProjectCampaignAssessment
} from "@/lib/project-campaign";

function longText(seed: string, repeat = 8) {
  return Array.from({ length: repeat }, () => seed).join(" ");
}

function buildExtendedInput() {
  return {
    scale: ProjectScale.EXTENDED,
    artifactFocus: ProjectArtifactFocus.RESEARCH,
    issueId: "",
    issueSeverity: 4,
    title: "",
    summary: "",
    abstract: "",
    essentialQuestion: "",
    methodsSummary: "",
    overview: "",
    context: "",
    evidence: "",
    analysis: "",
    recommendations: "",
    reflection: "",
    missionGoal: "",
    successCriteria: "",
    targetLaunchDate: null,
    keyTakeaways: [] as string[],
    artifactLinks: [] as Array<{ label: string; url: string }>,
    references: [] as Array<{ label: string; url: string; sourceType: "OTHER"; note?: string }>,
    laneSections: [] as Array<{ key: string; title: string; prompt: string; value: string }>,
    feedbackCount: 0,
    milestoneInputs: [],
    deliverableInputs: []
  };
}

describe("project campaign helpers", () => {
  it("creates the fixed five-milestone month-long campaign", () => {
    const milestones = buildDefaultProjectMilestones(new Date("2026-03-01T12:00:00.000Z"));

    expect(milestones.map((milestone) => milestone.key)).toEqual([
      ProjectMilestoneKey.CHARTER,
      ProjectMilestoneKey.EVIDENCE_BOARD,
      ProjectMilestoneKey.BUILD_SPRINT,
      ProjectMilestoneKey.FEEDBACK_LOOP,
      ProjectMilestoneKey.LAUNCH_WEEK
    ]);
    expect(milestones.map((milestone) => milestone.status)).toEqual([
      ProjectMilestoneStatus.ACTIVE,
      ProjectMilestoneStatus.LOCKED,
      ProjectMilestoneStatus.LOCKED,
      ProjectMilestoneStatus.LOCKED,
      ProjectMilestoneStatus.LOCKED
    ]);
    expect(milestones.map((milestone) => milestone.targetDate.toISOString().slice(0, 10))).toEqual([
      "2026-03-04",
      "2026-03-11",
      "2026-03-19",
      "2026-03-25",
      "2026-03-31"
    ]);
  });

  it("keeps the charter active until the charter fields are complete", () => {
    const assessment = buildProjectCampaignAssessment(buildExtendedInput());

    expect(assessment.activeMilestoneKey).toBe(ProjectMilestoneKey.CHARTER);
    expect(assessment.milestones[0]?.status).toBe(ProjectMilestoneStatus.ACTIVE);
    expect(
      assessment.milestones.find((milestone) => milestone.key === ProjectMilestoneKey.EVIDENCE_BOARD)
        ?.status
    ).toBe(ProjectMilestoneStatus.LOCKED);
    expect(assessment.nextAction).toBe("Choose the main issue.");
  });

  it("unlocks the evidence board once the charter is complete", () => {
    const assessment = buildProjectCampaignAssessment({
      ...buildExtendedInput(),
      issueId: "issue-1",
      title: longText("Title", 3),
      essentialQuestion: longText("Why does this pattern keep happening", 3),
      missionGoal: longText("Finish a strong month long mission goal", 4),
      successCriteria: longText("Success means the project proves the problem and presents a clear response", 4),
      targetLaunchDate: new Date("2026-04-10T12:00:00.000Z")
    });

    expect(
      assessment.milestones.find((milestone) => milestone.key === ProjectMilestoneKey.CHARTER)?.complete
    ).toBe(true);
    expect(assessment.activeMilestoneKey).toBe(ProjectMilestoneKey.EVIDENCE_BOARD);
    expect(
      assessment.milestones.find((milestone) => milestone.key === ProjectMilestoneKey.EVIDENCE_BOARD)
        ?.status
    ).toBe(ProjectMilestoneStatus.ACTIVE);
  });

  it("marks launch week ready only when every deliverable is complete", () => {
    const assessment = buildProjectCampaignAssessment({
      ...buildExtendedInput(),
      issueId: "issue-1",
      title: longText("Revenue concentration mission", 3),
      summary: longText("Summary", 5),
      abstract: longText("Abstract", 8),
      essentialQuestion: longText("How should the league respond to the evidence", 3),
      methodsSummary: longText("Methods", 6),
      overview: longText("Overview", 6),
      context: longText("Context", 6),
      evidence: longText("Evidence", 10),
      analysis: longText("Analysis", 8),
      recommendations: longText("Recommendation", 6),
      reflection: longText("Reflection", 6),
      missionGoal: longText("Mission goal", 6),
      successCriteria: longText("Success criteria", 8),
      targetLaunchDate: new Date("2026-04-10T12:00:00.000Z"),
      keyTakeaways: [longText("Takeaway one", 3), longText("Takeaway two", 3)],
      references: [
        {
          label: "League memo",
          url: "https://example.com/memo",
          sourceType: "OTHER"
        }
      ],
      laneSections: [
        {
          key: "model",
          title: "Model",
          prompt: "What is the model doing?",
          value: longText("Lane section build", 8)
        }
      ],
      feedbackCount: 1,
      deliverableInputs: [
        {
          key: ProjectDeliverableKey.CORE_BUILD,
          contentMd: longText("Core build draft", 8),
          artifactUrl: "https://example.com/tool"
        },
        {
          key: ProjectDeliverableKey.REVISION_LOG,
          contentMd: longText("Revision log", 8)
        },
        {
          key: ProjectDeliverableKey.LAUNCH_DECK,
          contentMd: longText("Launch deck", 8),
          artifactUrl: "https://example.com/deck"
        }
      ]
    });

    expect(assessment.deliverables.every((deliverable) => deliverable.complete)).toBe(true);
    expect(assessment.launchReady).toBe(true);
    expect(
      assessment.milestones.find((milestone) => milestone.key === ProjectMilestoneKey.LAUNCH_WEEK)
        ?.complete
    ).toBe(true);
  });
});
