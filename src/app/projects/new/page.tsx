import Link from "next/link";

import { ProjectType } from "@prisma/client";

import { Badge } from "@/components/badge";
import { ProjectStudioForm } from "@/components/project-studio-form";
import { SectionHeading } from "@/components/section-heading";
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
  searchParams?: { lane?: string };
}) {
  const viewer = await getViewer();
  const { issues, teams, users, proposals } = await getProjectStudioData();
  const requestedLane = searchParams?.lane as LaneTag | undefined;
  const lanePrimary = validLanes.includes(requestedLane ?? "ECONOMIC_INVESTIGATORS")
    ? (requestedLane as LaneTag)
    : "ECONOMIC_INVESTIGATORS";

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Project Studio"
        title="Build a publishable research project"
        description="The studio is where students move from an idea to a polished brief, memo, tool write-up, or strategy dossier. The form below is structured so the same record can later be published inside BOW Universe and externally on the web or as a PDF."
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
              issueIds: [],
              teamId: "",
              supportingProposalId: "",
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
