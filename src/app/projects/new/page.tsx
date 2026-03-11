import Link from "next/link";

import { ProjectArtifactFocus, ProjectScale, ProjectType } from "@prisma/client";

import { Badge } from "@/components/badge";
import { ProjectStudioForm } from "@/components/project-studio-form";
import { SectionHeading } from "@/components/section-heading";
import {
  buildDefaultProjectDeliverables,
  buildDefaultProjectMilestones
} from "@/lib/project-campaign";
import { prisma } from "@/lib/prisma";
import { parseProjectStudioPrefill } from "@/lib/studio-entry";
import {
  hasStudentSubmittedProject,
  shouldUseBeginnerProjectMode
} from "@/lib/student-flow";
import type { LaneTag } from "@/lib/types";
import { createProjectAction } from "@/server/actions";
import { getViewer } from "@/server/auth";
import { getProjectStudioData } from "@/server/data";

const validLanes: LaneTag[] = [
  "TOOL_BUILDERS",
  "STRATEGIC_OPERATORS",
  "ECONOMIC_INVESTIGATORS"
];

function getArtifactFocusForLane(lane: LaneTag) {
  if (lane === "TOOL_BUILDERS") {
    return ProjectArtifactFocus.TOOL;
  }

  if (lane === "STRATEGIC_OPERATORS") {
    return ProjectArtifactFocus.STRATEGY;
  }

  return ProjectArtifactFocus.RESEARCH;
}

export default async function NewProjectPage({
  searchParams
}: {
  searchParams?: Promise<{
    lane?: string;
    issueId?: string;
    teamId?: string;
    supportingProposalId?: string;
    beginner?: string;
    studio?: string;
  }>;
}) {
  const viewer = await getViewer();
  const resolvedSearchParams = (await searchParams) ?? {};
  const [studioData, studentProjects] = await Promise.all([
    getProjectStudioData(),
    viewer?.role === "STUDENT"
      ? prisma.project.findMany({
          where: {
            createdByUserId: viewer.id
          },
          select: {
            submissionStatus: true
          }
        })
      : Promise.resolve([])
  ]);
  const { issues, teams, users, proposals } = studioData;
  const prefill = parseProjectStudioPrefill(resolvedSearchParams);
  const beginnerMode =
    viewer?.role === "STUDENT"
      ? shouldUseBeginnerProjectMode({
          hasSubmittedProject: hasStudentSubmittedProject(studentProjects),
          forceFullStudio: resolvedSearchParams.studio === "full"
        })
      : false;
  const lanePrimary = validLanes.includes(prefill.lanePrimary ?? "ECONOMIC_INVESTIGATORS")
    ? (prefill.lanePrimary as LaneTag)
    : "ECONOMIC_INVESTIGATORS";
  const projectScale = beginnerMode ? ProjectScale.FIRST_PROJECT : ProjectScale.EXTENDED;
  const artifactFocus = getArtifactFocusForLane(lanePrimary);
  const initialMilestones = buildDefaultProjectMilestones();
  const initialDeliverables = buildDefaultProjectDeliverables();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={beginnerMode ? "First Project Guide" : "Project Campaign Studio"}
        title={beginnerMode ? "One question at a time" : "Build a month-long mission campaign"}
        description={
          beginnerMode
            ? "This version keeps the work small. Pick an issue, answer one guided question at a time, and the studio will build the formal project fields for you before you submit."
            : "This studio turns the next project into a bigger month-long mission. Students move through a charter, evidence board, build sprint, feedback loop, and launch week with deliverables that unlock along the way."
        }
      />

      {viewer ? (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <Badge tone="success">Studio mode</Badge>
          </div>
          <ProjectStudioForm
            action={createProjectAction}
            viewerId={viewer.id}
            viewerRole={viewer.role}
            issues={issues}
            teams={teams}
            users={users}
            proposals={proposals}
            intentLabel="Submit for review"
            beginnerMode={beginnerMode}
            initial={{
              projectScale,
              artifactFocus,
              missionGoal: "",
              successCriteria: "",
              targetLaunchDate: initialMilestones[4]?.targetDate ?? null,
              milestones: initialMilestones.map((milestone) => ({
                key: milestone.key,
                targetDate: milestone.targetDate,
                completionNote: milestone.completionNote
              })),
              deliverables: initialDeliverables.map((deliverable) => ({
                key: deliverable.key,
                contentMd: deliverable.contentMd,
                artifactUrl: deliverable.artifactUrl
              })),
              title: "",
              summary: "",
              abstract: "",
              essentialQuestion: "",
              methodsSummary: "",
              projectType:
                artifactFocus === ProjectArtifactFocus.TOOL
                  ? ProjectType.TOOL
                  : artifactFocus === ProjectArtifactFocus.STRATEGY
                    ? ProjectType.STRATEGY
                    : ProjectType.INVESTIGATION,
              lanePrimary,
              laneTags: [lanePrimary],
              issueId: prefill.issueId,
              teamId: prefill.teamId,
              supportingProposalId: beginnerMode ? prefill.supportingProposalId : "",
              artifactLinks: [],
              references: [],
              keywords: [],
              keyTakeaways: [],
              publicationSlug: "",
              findingsMd: "",
              overview: "",
              context: "",
              evidence: "",
              analysis: "",
              recommendations: "",
              reflection: "",
              laneSections: [],
              collaboratorIds: []
            }}
          />
        </div>
      ) : (
        <div className="panel p-6">
          <p className="text-sm leading-6 text-ink/68">
            Sign in to start a studio draft. Public readers can browse projects, but only
            signed-in students and admins can create or revise work.
          </p>
          <div className="mt-4">
            <Link
              href="/login"
              className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
