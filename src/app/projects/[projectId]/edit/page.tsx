import { notFound } from "next/navigation";

import { ProjectStudioForm } from "@/components/project-studio-form";
import { SectionHeading } from "@/components/section-heading";
import { updateProjectAction } from "@/server/actions";
import { getViewer, requireUser } from "@/server/auth";
import { getProjectStudioData, parseProjectJson } from "@/server/data";

export default async function EditProjectPage({ params }: { params: { projectId: string } }) {
  const [viewer, studioData] = await Promise.all([getViewer(), getProjectStudioData(params.projectId)]);
  const { project, issues, teams, users, proposals } = studioData;

  if (!project) {
    notFound();
  }

  await requireUser();

  if (viewer?.id !== project.createdByUserId && viewer?.role !== "ADMIN") {
    notFound();
  }

  const parsed = parseProjectJson(project);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Project Studio"
        title={`Revise ${project.title}`}
        description="This route reopens the adaptive project coach so students can strengthen the lane-specific sections, improve weak evidence or analysis, and resubmit a more publication-ready project."
      />

      <ProjectStudioForm
        action={updateProjectAction}
        viewerId={viewer!.id}
        issues={issues}
        teams={teams}
        users={users}
        proposals={proposals}
        intentLabel="Resubmit for review"
        initial={{
          id: project.id,
          title: project.title,
          summary: project.summary,
          abstract: project.abstract ?? project.summary,
          essentialQuestion: project.essentialQuestion ?? parsed.content.questionOrMission,
          methodsSummary: project.methodsSummary ?? "",
          projectType: project.projectType,
          lanePrimary: parsed.lanePrimary,
          laneTags: parsed.laneTags,
          issueIds: project.issueLinks.map((link) => link.issueId),
          teamId: project.teamId ?? "",
          supportingProposalId: project.supportingProposalId ?? "",
          artifactLinks: parsed.artifactLinks,
          references: parsed.references,
          keywords: parsed.keywords,
          keyTakeaways: parsed.keyTakeaways,
          publicationSlug: project.publicationSlug ?? "",
          findingsMd: project.findingsMd,
          overview: parsed.content.overview,
          context: parsed.content.context,
          evidence: parsed.content.evidence,
          analysis: parsed.content.analysis,
          recommendations: parsed.content.recommendations,
          reflection: parsed.content.reflection,
          laneSections: parsed.content.laneSections,
          collaboratorIds: project.collaborators.map((collaborator) => collaborator.userId)
        }}
      />
    </div>
  );
}
