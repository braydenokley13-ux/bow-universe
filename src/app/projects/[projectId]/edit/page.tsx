import { notFound } from "next/navigation";

import { ProjectScale } from "@prisma/client";

import { ProjectStudioForm } from "@/components/project-studio-form";
import { resolveProjectPrimaryIssueId } from "@/lib/project-issues";
import { SectionHeading } from "@/components/section-heading";
import { prisma } from "@/lib/prisma";
import {
  hasStudentSubmittedProject,
  shouldUseBeginnerProjectMode
} from "@/lib/student-flow";
import { updateProjectAction } from "@/server/actions";
import { getViewer, requireUser } from "@/server/auth";
import { getProjectStudioData, parseProjectJson } from "@/server/data";
import { canUserEditProjectDraft } from "@/server/project-access";

function getRepairItems(project: { updatedAt: Date } & Record<string, unknown>) {
  const feedbackEntries = Array.isArray(project.feedbackEntries)
    ? (project.feedbackEntries as Array<{
        id: string;
        sectionKey: string;
        body: string;
        createdAt: Date;
        createdBy: { name: string } | string;
      }>)
    : [];

  return feedbackEntries
    .filter((entry) => entry.createdAt.getTime() >= project.updatedAt.getTime())
    .map((entry) => ({
      id: entry.id,
      sectionKey: entry.sectionKey,
      body: entry.body,
      createdBy: entry.createdBy
    }));
}

export default async function EditProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ beginner?: string; studio?: string; repair?: string }>;
}) {
  const { projectId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const [viewer, studioData] = await Promise.all([getViewer(), getProjectStudioData(projectId)]);
  const { project, issues, teams, users, proposals } = studioData;

  if (!project) {
    notFound();
  }

  await requireUser();

  if (!viewer || !canUserEditProjectDraft(project, viewer.id, viewer.role)) {
    notFound();
  }

  const parsed = parseProjectJson(project);
  const studentProjects =
    viewer?.role === "STUDENT"
      ? await prisma.project.findMany({
          where: {
            createdByUserId: viewer.id
          },
          select: {
            submissionStatus: true
          }
        })
      : [];
  const beginnerMode =
    viewer?.role === "STUDENT"
      ? project.scale === ProjectScale.EXTENDED
        ? false
        : shouldUseBeginnerProjectMode({
            hasSubmittedProject: hasStudentSubmittedProject(studentProjects),
            currentProjectStatus: project.submissionStatus,
            forceFullStudio: resolvedSearchParams.studio === "full"
          })
      : false;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={
          beginnerMode
            ? "First Project Guide"
            : project.scale === ProjectScale.EXTENDED
              ? "Project Campaign Studio"
              : "Project Studio"
        }
        title={
          beginnerMode
            ? `Keep building ${project.title}`
            : project.scale === ProjectScale.EXTENDED
              ? `Run the campaign for ${project.title}`
              : `Revise ${project.title}`
        }
        description={
          beginnerMode
            ? "This route reopens the guided first-project flow so students can fix one question at a time, keep moving, and submit without getting buried in advanced fields."
            : project.scale === ProjectScale.EXTENDED
              ? "This route reopens the month-long campaign workspace so students can move milestone by milestone, complete the launch package, and tighten the project before review."
              : "This route reopens the adaptive project coach so students can strengthen the lane-specific sections, improve weak evidence or analysis, and resubmit a more publication-ready project."
        }
      />

      <ProjectStudioForm
        action={updateProjectAction}
        viewerId={viewer!.id}
        viewerRole={viewer!.role}
        issues={issues}
        teams={teams}
        users={users}
        proposals={proposals}
        intentLabel="Resubmit for review"
        beginnerMode={beginnerMode}
        repairItems={getRepairItems(project)}
        initial={{
          id: project.id,
          projectScale: parsed.scale,
          artifactFocus: parsed.artifactFocus,
          missionGoal: parsed.missionGoal,
          successCriteria: parsed.successCriteria,
          targetLaunchDate: parsed.targetLaunchDate,
          milestones: parsed.campaign.milestones.map((milestone) => ({
            key: milestone.key,
            targetDate: milestone.targetDate,
            completionNote: milestone.completionNote
          })),
          deliverables: parsed.campaign.deliverables.map((deliverable) => ({
            key: deliverable.key,
            contentMd: deliverable.contentMd,
            artifactUrl: deliverable.artifactUrl
          })),
          title: project.title,
          summary: project.summary,
          abstract: project.abstract ?? project.summary,
          essentialQuestion: project.essentialQuestion ?? parsed.content.questionOrMission,
          methodsSummary: project.methodsSummary ?? "",
          projectType: project.projectType,
          lanePrimary: parsed.lanePrimary,
          laneTags: parsed.laneTags,
          issueId: resolveProjectPrimaryIssueId({
            issueId: project.issueId,
            issueLinks: project.issueLinks
          }),
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
