import Link from "next/link";

import { OnboardingWizard } from "@/components/onboarding-wizard";
import { SectionHeading } from "@/components/section-heading";
import { StudentUniverseOnboarding } from "@/components/student-universe-onboarding";
import { shouldForceStudentOnboarding } from "@/lib/student-onboarding";
import { getViewer } from "@/server/auth";
import { getStudentOnboardingData } from "@/server/showcase-data";

export default async function StartPage({
  searchParams
}: {
  searchParams?: Promise<{ tour?: string; replay?: string }>;
}) {
  const viewer = await getViewer();
  const resolvedSearchParams = (await searchParams) ?? {};

  if (viewer?.role === "STUDENT") {
    const onboardingData = await getStudentOnboardingData(viewer.id);

    if (!onboardingData) {
      return null;
    }

    const forceTour = shouldForceStudentOnboarding({
      role: viewer.role,
      onboardingExperienceVersion: onboardingData.onboardingExperienceVersion,
      hasSubmittedFirstProject: onboardingData.hasSubmittedFirstProject,
      hasOpenProjectOrProposal: onboardingData.hasOpenProjectOrProposal
    });
    const replayTour = resolvedSearchParams.replay === "1";
    const showTour = forceTour || resolvedSearchParams.tour === "1" || replayTour;

    if (showTour) {
      return (
        <div className="space-y-8">
          <SectionHeading
            eyebrow="Start here"
            title={replayTour ? "Replay the student universe tour" : "Take the full universe tour before your first mission"}
            description={
              replayTour
                ? "Walk back through the five-step universe guide, then return to the mission hub when you are ready."
                : "This first-time path shows the whole student-side universe one piece at a time, then drops you into the guided first project with a real issue already picked."
            }
          />
          <StudentUniverseOnboarding
            data={onboardingData}
            mode={forceTour ? "forced" : "replay"}
          />
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <SectionHeading
          eyebrow="Start here"
          title="Pick one mission and begin"
          description="Use this page as your mission hub. Start from a live league issue, or replay the full universe tour if you want the guided walkthrough again."
        />
        <section className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
                Optional replay
              </p>
              <h2 className="mt-3 font-display text-2xl text-ink">Want the full walkthrough again?</h2>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                Replay the five-step universe tour anytime, then come back here to pick a fresh mission.
              </p>
            </div>
            <Link
              href="/start?replay=1"
              className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
            >
              Replay universe tour
            </Link>
          </div>
        </section>
        <OnboardingWizard
          missions={onboardingData.missionCandidates}
          linkedTeamName={onboardingData.linkedTeam?.name ?? null}
          gradeBand={onboardingData.gradeBand}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Start here"
        title="Sign in to get your first mission"
        description="Students now start from live league issues instead of from a blank lane choice. Sign in to see the mission, section, and first small steps that fit your class."
      />

      <section className="panel p-8">
        <h2 className="font-display text-2xl text-ink">What students will see</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "1. Pick an issue",
              body: "Choose from a short list of recommended league problems instead of starting from an empty studio."
            },
            {
              title: "2. Get a suggested lane",
              body: "The app suggests the best lane first, but students can switch if another angle fits better."
            },
            {
              title: "3. Answer tiny questions",
              body: "The first project opens in a smaller beginner flow that removes most blank-page moments."
            }
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-line bg-white/70 p-5">
              <p className="font-medium text-ink">{item.title}</p>
              <p className="mt-3 text-sm leading-6 text-ink/68">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Sign in
          </Link>
          <Link
            href="/issues"
            className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
          >
            Browse issues
          </Link>
        </div>
      </section>
    </div>
  );
}
