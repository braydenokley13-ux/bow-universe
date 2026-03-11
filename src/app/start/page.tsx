import Link from "next/link";

import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ResearchStageMap } from "@/components/research-stage-map";
import { SectionHeading } from "@/components/section-heading";
import { StudentUniverseOnboarding } from "@/components/student-universe-onboarding";
import { buildResearchStageDisplay } from "@/lib/research-stage";
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
  const startResearchMap = buildResearchStageDisplay("ASK_QUESTION", {
    previewStages: ["TEST_SYSTEM"],
    nextStepDetail: "Pick one live issue, then let the guide help you turn it into a real sports-economics question."
  });

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
          <ResearchStageMap
            eyebrow="Research loop"
            title="The same five steps still guide the tour"
            description="The tour helps students understand the world first, but the work still moves through the same research loop once they begin."
            steps={startResearchMap.researchStageProgress}
            nextStep={startResearchMap.nextResearchStep}
            compact
            simulationPreviewAvailable={startResearchMap.simulationPreviewAvailable}
            simulationPreviewLabel="The system-test step stays visible so students know their research will grow into modeling later."
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
        <ResearchStageMap
          eyebrow="Research loop"
          title="What students do here"
          description="The goal is not to wander the app. The goal is to move one real sports-economics question through five clear research steps."
          steps={startResearchMap.researchStageProgress}
          nextStep={startResearchMap.nextResearchStep}
          compact
          simulationPreviewAvailable={startResearchMap.simulationPreviewAvailable}
          simulationPreviewLabel="Students can preview the idea of system testing early, then use deeper modeling later when their evidence is stronger."
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

      <ResearchStageMap
        eyebrow="Research loop"
        title="One research cycle, five clear steps"
        description="Students should feel the fun of discovery early: one issue, one question, one evidence trail, one system test to preview, one case to make."
        steps={startResearchMap.researchStageProgress}
        nextStep={startResearchMap.nextResearchStep}
        compact
        simulationPreviewAvailable={startResearchMap.simulationPreviewAvailable}
        simulationPreviewLabel="The model step is visible from the beginning so students know the league can be tested, even if the deeper tools come later."
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
