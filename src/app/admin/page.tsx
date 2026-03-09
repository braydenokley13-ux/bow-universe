import Link from "next/link";

import { Badge } from "@/components/badge";
import { AdminChallengeDesk } from "@/components/admin-challenge-desk";
import { AdminClassCodeManager } from "@/components/admin-class-code-manager";
import { AdminStudentMomentumDesk } from "@/components/admin-student-momentum-desk";
import { SectionHeading } from "@/components/section-heading";
import { AdminDecisionDesk } from "@/components/admin-decision-desk";
import { AdminGlossaryManager } from "@/components/admin-glossary-manager";
import { AdminIssueWorkbench } from "@/components/admin-issue-workbench";
import { AdminNewsroomDesk } from "@/components/admin-newsroom-desk";
import { AdminProposalWorkflowCard } from "@/components/admin-proposal-workflow-card";
import { AdminQueueSummary } from "@/components/admin-queue-summary";
import { AdminRoleCard } from "@/components/admin-role-card";
import { AdminStudentAccountManager } from "@/components/admin-student-account-manager";
import {
  advanceSeasonAction,
  createStudentAccountAction,
  deleteGlossaryTermAction,
  recordDecisionAction,
  saveGlossaryTermAction,
  saveIssueAction,
  updateProposalStatusAction,
  updateUserRoleAction
} from "@/server/actions";
import { requireAdmin } from "@/server/auth";
import {
  createChallengeAction,
  createClassCodeAction,
  createNewsPostAction
} from "@/server/community-actions";
import { getAllGlossaryTerms, getAdminPageData } from "@/server/data";
import { getProposalReviewReadiness } from "@/lib/review-readiness";
import { shouldShowDecisionDesk } from "@/lib/workflow-guards";
import { getAdminShowcaseData } from "@/server/showcase-data";

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<{ studentAccount?: string; studentEmail?: string }>;
}) {
  await requireAdmin();
  const resolvedSearchParams = (await searchParams) ?? {};
  const [
    { users, issues, proposals, currentSeason, rulesets, teams, activity, publications },
    showcaseData,
    glossaryTerms
  ] = await Promise.all([getAdminPageData(), getAdminShowcaseData(), getAllGlossaryTerms()]);
  const activationBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const proposalReadiness = new Map(
    proposals.map((proposal) => [proposal.id, getProposalReviewReadiness(proposal)])
  );
  const workflowQueue = proposals.filter((proposal) =>
    ["SUBMITTED", "REVISION_REQUESTED", "APPROVED_FOR_INTERNAL_PUBLICATION", "READY_FOR_VOTING", "VOTING", "DECISION"].includes(proposal.status)
  );
  const decisionQueue = proposals.filter((proposal) => shouldShowDecisionDesk(proposal.status));
  const issueCleanupQueue = issues.filter(
    (issue) => issue.severity >= 4 || !issue.evidenceMd || JSON.stringify(issue.metricsJson ?? {}) === "{}"
  );
  const publicationQueue = publications.filter(
    (publication) => !publication.externalApproved || !publication.externalReady
  );
  const students = users.filter((user) => user.role === "STUDENT");

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin"
        title="Commissioner workspace"
        description="This workspace now shows what needs action, what is blocked, and what should happen next before a commissioner moves workflow state."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Current season</p>
          <p className="mt-3 font-display text-3xl text-ink">{currentSeason?.year ?? "-"}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Rule versions</p>
          <p className="mt-3 font-display text-3xl text-ink">{rulesets.length}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Users</p>
          <p className="mt-3 font-display text-3xl text-ink">{users.length}</p>
        </div>
      </section>

      <AdminQueueSummary
        items={[
          {
            title: "Workflow review",
            count: workflowQueue.length,
            detail: "Submitted and in-flight proposals that still need commissioner workflow attention.",
            href: "#proposal-workflow",
            tone: workflowQueue.length > 0 ? "warn" : "success"
          },
          {
            title: "Decision desk",
            count: decisionQueue.length,
            detail: "Proposals that are close enough to a final commissioner decision to review now.",
            href: "#decision-desk",
            tone: decisionQueue.length > 0 ? "warn" : "success"
          },
          {
            title: "Issue cleanup",
            count: issueCleanupQueue.length,
            detail: "High-pressure or incomplete issue records that still need evidence or metrics cleanup.",
            href: "#issue-workbench",
            tone: issueCleanupQueue.length > 0 ? "warn" : "success"
          },
          {
            title: "Archive review",
            count: publicationQueue.length,
            detail: "Archive records that still need external readiness or export queue attention.",
            href: "/admin/publications",
            tone: publicationQueue.length > 0 ? "warn" : "success"
          },
          {
            title: "Student momentum",
            count: showcaseData.studentMomentum.totalFlagged,
            detail: "Students who have not started, stalled in draft, or are sitting on revision feedback.",
            href: "#student-momentum",
            tone: showcaseData.studentMomentum.totalFlagged > 0 ? "warn" : "success"
          }
        ]}
      />

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Class launch flow</p>
            <h3 className="mt-3 font-display text-2xl text-ink">Set up a class in four small moves</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">
              Create a class code, pick the grade-band default, link a cohort, set milestone dates, and then use the student momentum desk to catch anyone who gets stuck.
            </p>
          </div>
          <Link
            href="/admin/cohorts"
            className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
          >
            Open cohorts
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            "1. Create a class code with the right default team and grade band.",
            "2. Link that code to a cohort so signups drop into the right class group.",
            "3. Add milestone dates for first draft, revision, and publishing checkpoints.",
            "4. Watch the momentum desk for students who still need a fast intervention."
          ].map((step) => (
            <div key={step} className="rounded-2xl border border-line bg-white/60 p-4 text-sm leading-6 text-ink/68">
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-ink">Season controls</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Advance the league one season at a time. This recalculates team snapshots, applies the pending ruleset, and records new pressure points.
            </p>
          </div>
          <form action={advanceSeasonAction}>
            <button
              type="submit"
              className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Advance to {currentSeason ? currentSeason.year + 1 : "next season"}
            </button>
          </form>
        </div>
      </section>

      <AdminStudentAccountManager
        action={createStudentAccountAction}
        activationBaseUrl={activationBaseUrl}
        notice={resolvedSearchParams.studentAccount}
        studentEmail={resolvedSearchParams.studentEmail}
        teams={teams}
        students={students}
      />

      <AdminStudentMomentumDesk momentum={showcaseData.studentMomentum} />

      <AdminClassCodeManager
        action={createClassCodeAction}
        teams={teams}
        cohorts={showcaseData.cohorts}
        classCodes={showcaseData.classCodes}
      />

      <AdminNewsroomDesk
        action={createNewsPostAction}
        posts={showcaseData.newsPosts}
      />

      <AdminChallengeDesk
        action={createChallengeAction}
        issues={issues}
        teams={teams}
        challenges={showcaseData.challenges}
      />

      <div id="issue-workbench">
        <AdminIssueWorkbench issues={issues} teams={teams} action={saveIssueAction} />
      </div>

      <section id="proposal-workflow" className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Proposal workflow desk</p>
            <h3 className="mt-3 font-display text-2xl text-ink">Guide workflow state safely</h3>
          </div>
          <Badge>{workflowQueue.length} open</Badge>
        </div>

        <div className="mt-6 space-y-4">
          {workflowQueue.map((proposal) => (
            <AdminProposalWorkflowCard
              key={proposal.id}
              proposal={proposal}
              readiness={proposalReadiness.get(proposal.id)!}
              action={updateProposalStatusAction}
            />
          ))}
        </div>
      </section>

      <section id="decision-desk" className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Decision desk</p>
            <h3 className="mt-3 font-display text-2xl text-ink">Record final proposal outcomes</h3>
          </div>
          <Badge>{decisionQueue.length}</Badge>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {decisionQueue.length > 0 ? (
            decisionQueue.map((proposal) => (
              <AdminDecisionDesk
                key={proposal.id}
                proposal={proposal}
                readiness={proposalReadiness.get(proposal.id)!}
                action={recordDecisionAction}
              />
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
              No proposals are in the decision-ready window right now.
            </p>
          )}
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-ink">Publication archive controls</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Internal publications can be checked for external readiness and export queue progress from the archive desk.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge>{publications.length} archived</Badge>
            <Link
              href="/admin/publications"
              className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
            >
              Open publication queue
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publications.slice(0, 6).map((publication) => (
            <div key={publication.id} className="rounded-2xl border border-line bg-white/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{publication.title}</p>
                  <p className="mt-1 text-sm text-ink/62">
                    {publication.publicationType.replaceAll("_", " ")}
                    {publication.issue ? ` · ${publication.issue.title}` : ""}
                    {publication.team ? ` · ${publication.team.name}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {publication.externalReady ? <Badge tone="success">External ready</Badge> : <Badge>Internal only</Badge>}
                  {publication.externalApproved ? <Badge tone="success">External approved</Badge> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl text-ink">User roles</h3>
          <Badge>{users.filter((user) => user.role === "ADMIN").length} admin</Badge>
        </div>

        <div className="mt-5 space-y-4">
          {users.map((user) => (
            <AdminRoleCard key={user.id} user={user} teams={teams} action={updateUserRoleAction} />
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl text-ink">Recent archive events</h3>
          <Badge>{activity.length}</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {activity.map((event) => (
            <div key={event.id} className="rounded-2xl border border-line bg-white/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-ink">{event.title}</p>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/55">
                  {new Date(event.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/68">{event.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Cohorts</p>
            <h3 className="mt-1 font-display text-2xl text-ink">Teacher cohort management</h3>
            <p className="mt-1 text-sm text-ink/60">Create cohorts, assign students, set milestone deadlines, and track submission progress.</p>
          </div>
          <Link
            href="/admin/cohorts"
            className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Manage cohorts →
          </Link>
        </div>
      </section>

      <section className="panel p-6">
        <AdminGlossaryManager
          terms={glossaryTerms}
          saveAction={saveGlossaryTermAction}
          deleteAction={deleteGlossaryTermAction}
        />
      </section>
    </div>
  );
}
