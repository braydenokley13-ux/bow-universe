import Link from "next/link";

import { OnboardingWizard } from "@/components/onboarding-wizard";
import { SectionHeading } from "@/components/section-heading";
import { getViewer } from "@/server/auth";
import { getStudentMissionControlData } from "@/server/showcase-data";

export default async function StartPage() {
  const viewer = await getViewer();

  if (viewer?.role === "STUDENT") {
    const missionControl = await getStudentMissionControlData(viewer.id);

    return (
      <div className="space-y-8">
        <SectionHeading
          eyebrow="Start here"
          title="Pick one mission and begin"
          description="Start from a live league issue, not from an empty form. The first project path now sets up the issue, suggests the lane, and breaks the writing into small steps."
        />
        <OnboardingWizard
          missions={missionControl.missionCandidates}
          linkedTeamName={missionControl.user?.linkedTeam?.name ?? null}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Start here"
        title="Sign in to get a recommended mission"
        description="Students now start from live league issues instead of from a blank lane choice. Sign in to see the first missions that best fit your team and the current league pressure."
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
