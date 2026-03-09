import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { StudentFeatureGate } from "@/components/student-feature-gate";
import { shouldGateAdvancedStudentWork } from "@/lib/classroom";
import { getViewer } from "@/server/auth";
import {
  joinChallengeAction,
  spotlightChallengeEntryAction
} from "@/server/community-actions";
import { getChallengePageData, getStudentExperienceState } from "@/server/showcase-data";

function sourceHref(sourceType: "PROJECT" | "PROPOSAL", sourceId: string) {
  return sourceType === "PROJECT" ? `/projects/${sourceId}` : `/proposals/${sourceId}`;
}

export default async function ChallengeDetailPage({
  params
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  const viewer = await getViewer();
  const [challenge, experience] = await Promise.all([
    getChallengePageData(challengeId, viewer?.id ?? null),
    viewer?.role === "STUDENT" ? getStudentExperienceState(viewer.id) : Promise.resolve(null)
  ]);

  if (!challenge) {
    notFound();
  }

  const isLocked =
    viewer?.role === "STUDENT" &&
    shouldGateAdvancedStudentWork({
      hasSubmittedFirstProject: experience?.hasSubmittedFirstProject ?? false
    });

  if (isLocked) {
    return (
      <div className="space-y-8">
        <SectionHeading
          eyebrow="Challenge detail"
          title={challenge.title}
          description={challenge.summary}
        />

        <StudentFeatureGate
          eyebrow="Challenges unlock next"
          title="Finish your first project before entering a challenge"
          description="Challenges are meant to build on work you have already started. Finish your first guided project, then come back and enter it here if it fits."
          primaryHref={experience?.currentProjectId ? `/projects/${experience.currentProjectId}/edit` : "/start"}
          primaryLabel={experience?.currentProjectId ? "Open current project" : "Start your first project"}
          secondaryHref="/challenges"
          secondaryLabel="Back to challenges"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Challenge detail"
        title={challenge.title}
        description={challenge.summary}
      />

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={challenge.isOpen ? "success" : "warn"}>
              {challenge.isOpen ? "Open now" : "Closed"}
            </Badge>
            <Badge>{challenge.allowedEntryType}</Badge>
            {challenge.issue ? <Badge>{challenge.issue.title}</Badge> : null}
            {challenge.team ? <Badge>{challenge.team.name}</Badge> : null}
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-white/60 p-5">
            <p className="font-medium text-ink">Challenge prompt</p>
            <p className="mt-3 text-sm leading-7 text-ink/70">{challenge.prompt}</p>
            {challenge.scoringNotesMd ? (
              <p className="mt-4 text-sm leading-6 text-ink/62">{challenge.scoringNotesMd}</p>
            ) : null}
          </div>

          {viewer ? (
            <div className="mt-6 rounded-2xl border border-line bg-white/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">Join with your work</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    Pick one of your own projects or proposals to enter. Joining awards the baseline challenge points, then later workflow milestones add more automatically.
                  </p>
                </div>
                {challenge.viewerEntry ? <Badge tone="success">Already entered</Badge> : null}
              </div>

              {!challenge.viewerEntry && challenge.isOpen ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {challenge.eligibleProjects.map((project) => (
                    <form key={project.id} action={joinChallengeAction} className="rounded-2xl border border-line bg-white/80 p-4">
                      <input type="hidden" name="challengeId" value={challenge.id} />
                      <input type="hidden" name="sourceType" value="PROJECT" />
                      <input type="hidden" name="sourceId" value={project.id} />
                      <p className="font-medium text-ink">{project.title}</p>
                      <p className="mt-2 text-sm text-ink/62">{project.submissionStatus.replaceAll("_", " ")}</p>
                      <button
                        type="submit"
                        className="mt-4 rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                      >
                        Enter project
                      </button>
                    </form>
                  ))}
                  {challenge.eligibleProposals.map((proposal) => (
                    <form key={proposal.id} action={joinChallengeAction} className="rounded-2xl border border-line bg-white/80 p-4">
                      <input type="hidden" name="challengeId" value={challenge.id} />
                      <input type="hidden" name="sourceType" value="PROPOSAL" />
                      <input type="hidden" name="sourceId" value={proposal.id} />
                      <p className="font-medium text-ink">{proposal.title}</p>
                      <p className="mt-2 text-sm text-ink/62">{proposal.status.replaceAll("_", " ")}</p>
                      <button
                        type="submit"
                        className="mt-4 rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                      >
                        Enter proposal
                      </button>
                    </form>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </article>

        <aside className="space-y-6">
          <section className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-2xl text-ink">Leaderboard</h3>
              <Badge>{challenge.leaderboard.length}</Badge>
            </div>

            <div className="mt-6 space-y-3">
              {challenge.leaderboard.length > 0 ? (
                challenge.leaderboard.map((entry, index) => (
                  <div key={entry.id} className="rounded-2xl border border-line bg-white/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-ink">
                        {index + 1}. {entry.user.name}
                      </p>
                      <Badge tone={index === 0 ? "success" : "default"}>{entry.totalScore} pts</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-ink/55">
                      {entry.scoreEvents.map((event) => (
                        <span key={event.kind} className="rounded-full border border-line bg-white/80 px-3 py-1">
                          {event.kind.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                    {viewer?.role === "ADMIN" ? (
                      <form action={spotlightChallengeEntryAction} className="mt-4 flex flex-wrap gap-3">
                        <input type="hidden" name="challengeEntryId" value={entry.id} />
                        <input
                          name="note"
                          type="text"
                          placeholder="Optional spotlight note"
                          className="min-w-[220px] flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                        >
                          Spotlight
                        </button>
                      </form>
                    ) : null}
                    <Link
                      href={sourceHref(entry.sourceType, entry.sourceId)}
                      className="mt-4 inline-flex rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
                    >
                      Open entry
                    </Link>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                  Nobody has entered this challenge yet.
                </p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
