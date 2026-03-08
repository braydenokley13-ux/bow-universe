import Link from "next/link";

import { ProjectType } from "@prisma/client";

import { Badge } from "@/components/badge";
import { ProjectStudioForm } from "@/components/project-studio-form";
import { SectionHeading } from "@/components/section-heading";
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
  "POLICY_REFORM_ARCHITECTS",
  "STRATEGIC_OPERATORS",
  "ECONOMIC_INVESTIGATORS"
];

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

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={beginnerMode ? "First Project Guide" : "Project Coach"}
        title={beginnerMode ? "One question at a time" : "Adaptive lane-by-lane project wizard"}
        description={
          beginnerMode
            ? "This version keeps the work small. Pick an issue, answer one guided question at a time, and the studio will build the formal project fields for you before you submit."
            : "This studio now coaches every lane one small step at a time. Tool Builders, Policy Reform Architects, Strategic Operators, and Economic Investigators each get lane-specific prompts, section coaching, and a stronger review gate before anything is submitted. Reform-support project work stays here, while formal proposal memos stay in the separate proposal studio."
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
            issues={issues}
            teams={teams}
            users={users}
            proposals={proposals}
            intentLabel="Submit for review"
            beginnerMode={beginnerMode}
            initial={{
              title: "",
              summary: "",
              abstract: "",
              essentialQuestion: "",
              methodsSummary: "",
              projectType:
                lanePrimary === "TOOL_BUILDERS"
                  ? ProjectType.TOOL
                  : lanePrimary === "STRATEGIC_OPERATORS"
                    ? ProjectType.STRATEGY
                    : lanePrimary === "POLICY_REFORM_ARCHITECTS"
                      ? ProjectType.PROPOSAL_SUPPORT
                      : ProjectType.INVESTIGATION,
              lanePrimary,
              laneTags: [lanePrimary],
              issueIds: prefill.issueIds,
              teamId: prefill.teamId,
              supportingProposalId: prefill.supportingProposalId,
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
