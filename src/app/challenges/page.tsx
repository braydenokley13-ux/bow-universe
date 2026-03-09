import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { StudentFeatureGate } from "@/components/student-feature-gate";
import { shouldGateAdvancedStudentWork } from "@/lib/classroom";
import { getViewer } from "@/server/auth";
import { getChallengesPageData, getStudentExperienceState } from "@/server/showcase-data";

export default async function ChallengesPage() {
  const viewer = await getViewer();
  const challenges = await getChallengesPageData(viewer?.id ?? null);
  const experience =
    viewer?.role === "STUDENT" ? await getStudentExperienceState(viewer.id) : null;
  const isLocked =
    viewer?.role === "STUDENT" &&
    shouldGateAdvancedStudentWork({
      hasSubmittedFirstProject: experience?.hasSubmittedFirstProject ?? false
    });

  if (isLocked) {
    return (
      <div className="space-y-8">
        <SectionHeading
          eyebrow="Challenges"
          title="Competitive research without arcade nonsense"
          description="Challenges reward real milestones: joining strong work, submitting it, improving it, publishing it, and earning commissioner spotlight."
        />

        <StudentFeatureGate
          eyebrow="Come back soon"
          title="Challenges make more sense after one real project"
          description="Finish your first guided project first. That way the challenge board feels like a next step instead of another giant choice."
          primaryHref={experience?.currentProjectId ? `/projects/${experience.currentProjectId}/edit` : "/start"}
          primaryLabel={experience?.currentProjectId ? "Keep building your project" : "Start your first project"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Challenges"
        title="Competitive research without arcade nonsense"
        description="Challenges reward real milestones: joining strong work, submitting it, improving it, publishing it, and earning commissioner spotlight."
      />

      <section className="grid gap-4 xl:grid-cols-2">
        {challenges.map((challenge) => (
          <article key={challenge.id} className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-3xl text-ink">{challenge.title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/68">{challenge.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={challenge.isOpen ? "success" : "warn"}>
                  {challenge.isOpen ? "Open now" : "Not open"}
                </Badge>
                <Badge>{challenge.allowedEntryType}</Badge>
              </div>
            </div>

            <div className="mt-4 text-sm text-ink/62">
              {challenge.issue ? <p>Issue: {challenge.issue.title}</p> : null}
              {challenge.team ? <p>Team: {challenge.team.name}</p> : null}
              <p>
                Window: {new Date(challenge.startsAt).toLocaleDateString("en-US")} to{" "}
                {new Date(challenge.endsAt).toLocaleDateString("en-US")}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-medium text-ink">Leaderboard snapshot</p>
              <div className="mt-3 space-y-2">
                {challenge.leaderboard.slice(0, 3).length > 0 ? (
                  challenge.leaderboard.slice(0, 3).map((entry, index) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm">
                      <span>{index + 1}. {entry.user.name}</span>
                      <span className="font-medium text-ink">{entry.totalScore} pts</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ink/60">No one has joined this challenge yet.</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/challenges/${challenge.id}`}
                className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                Open challenge
              </Link>
              {challenge.viewerEntry ? (
                <span className="rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success">
                  You already entered
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
