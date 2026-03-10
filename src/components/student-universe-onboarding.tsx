"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  completeOnboardingAction,
  saveOnboardingProgressAction
} from "@/server/actions";
import {
  buildUniversePreviewCards,
  buildWorkPreviewCards,
  CURRENT_STUDENT_ONBOARDING_VERSION,
  studentOnboardingStepIds,
  type StudentOnboardingData,
  type StudentOnboardingStepId
} from "@/lib/student-onboarding";
import { buildGuidedProjectHref } from "@/lib/student-flow";
import {
  gradeBandDescriptions,
  gradeBandLabels,
  type LaneTag
} from "@/lib/types";

import { StudentMissionPicker } from "./onboarding-wizard";
import { WizardStepRail } from "./wizard-step-rail";

type StudentUniverseOnboardingProps = {
  data: StudentOnboardingData;
  mode?: "forced" | "replay";
};

const stepCopy: Record<
  StudentOnboardingStepId,
  { title: string; shortTitle: string; eyebrow: string; description: string }
> = {
  welcome: {
    title: "Welcome and track",
    shortTitle: "Welcome",
    eyebrow: "Step 1",
    description: "Pick the class track first so the universe knows how much help to show at once."
  },
  universe: {
    title: "How the universe works",
    shortTitle: "Universe",
    eyebrow: "Step 2",
    description: "See the main places students use most so the app feels like a world instead of a pile of pages."
  },
  problems: {
    title: "Where problems live",
    shortTitle: "Problems",
    eyebrow: "Step 3",
    description: "Every strong project starts from a live issue, so this step shows where missions come from."
  },
  work: {
    title: "How student work moves",
    shortTitle: "Work",
    eyebrow: "Step 4",
    description: "Projects, proposals, challenges, research, and your portfolio are part of one loop, not separate random tools."
  },
  mission: {
    title: "Pick your first mission",
    shortTitle: "Mission",
    eyebrow: "Step 5",
    description: "Use the same guided mission chooser the app already has, but now after the whole universe makes sense."
  }
};

function timingTone(timing: "use_now" | "use_later") {
  return timing === "use_now"
    ? "border-success/20 bg-success/10 text-success"
    : "border-line bg-white/80 text-ink/62";
}

function stepIndex(step: StudentOnboardingStepId) {
  return studentOnboardingStepIds.indexOf(step);
}

export function StudentUniverseOnboarding({
  data,
  mode = "forced"
}: StudentUniverseOnboardingProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StudentOnboardingStepId>(
    mode === "replay" ? "welcome" : data.progress?.currentStep ?? "welcome"
  );
  const [visitedUntil, setVisitedUntil] = useState(
    mode === "replay" ? 0 : Math.max(stepIndex(data.progress?.currentStep ?? "welcome"), 0)
  );
  const [selectedGradeBand, setSelectedGradeBand] = useState<
    keyof typeof gradeBandLabels | ""
  >(mode === "replay" ? data.gradeBand ?? "" : data.progress?.selectedGradeBand ?? data.gradeBand ?? "");
  const [selectedMissionId, setSelectedMissionId] = useState(
    mode === "replay"
      ? data.missionCandidates[0]?.issue.id ?? ""
      : data.progress?.selectedMissionId ?? data.missionCandidates[0]?.issue.id ?? ""
  );
  const [selectedLane, setSelectedLane] = useState<LaneTag | null>(
    mode === "replay"
      ? data.missionCandidates[0]?.suggestedLane ?? null
      : data.progress?.selectedLane ?? data.missionCandidates[0]?.suggestedLane ?? null
  );
  const [isPending, startTransition] = useTransition();

  const selectedMission =
    data.missionCandidates.find((mission) => mission.issue.id === selectedMissionId) ??
    data.missionCandidates[0] ??
    null;
  const activeLane = selectedLane ?? selectedMission?.suggestedLane ?? null;
  const universeCards = buildUniversePreviewCards({
    gradeBand: selectedGradeBand || null,
    stats: data.stats
  });
  const workCards = buildWorkPreviewCards({
    gradeBand: selectedGradeBand || null,
    hasSubmittedFirstProject: data.hasSubmittedFirstProject,
    stats: data.stats
  });

  function persistProgress(nextStep: StudentOnboardingStepId, overrides?: {
    gradeBand?: keyof typeof gradeBandLabels | "";
    missionId?: string;
    lane?: LaneTag | null;
  }) {
    const gradeBand = (overrides?.gradeBand ?? selectedGradeBand) || null;
    const missionId = overrides?.missionId ?? selectedMissionId;
    const lane = overrides?.lane ?? activeLane;

    startTransition(async () => {
      await saveOnboardingProgressAction({
        step: nextStep,
        gradeBand,
        selectedMissionId: missionId || null,
        selectedLane: lane
      });
    });
  }

  function moveToStep(nextStep: StudentOnboardingStepId) {
    const nextIndex = stepIndex(nextStep);
    if (nextIndex > visitedUntil + 1) {
      return;
    }

    setCurrentStep(nextStep);
    setVisitedUntil((current) => Math.max(current, nextIndex));
    persistProgress(nextStep);
  }

  function handleGradeBandChange(value: keyof typeof gradeBandLabels) {
    setSelectedGradeBand(value);
    persistProgress(currentStep, { gradeBand: value });
  }

  function handleMissionChange(missionId: string) {
    const mission =
      data.missionCandidates.find((candidate) => candidate.issue.id === missionId) ?? null;
    const nextLane = mission?.suggestedLane ?? null;

    setSelectedMissionId(missionId);
    setSelectedLane(nextLane);
    persistProgress(currentStep, {
      missionId,
      lane: nextLane
    });
  }

  function handleLaneChange(lane: LaneTag) {
    setSelectedLane(lane);
    persistProgress(currentStep, { lane });
  }

  function handlePrevious() {
    const currentIndex = stepIndex(currentStep);

    if (currentIndex <= 0) {
      return;
    }

    moveToStep(studentOnboardingStepIds[currentIndex - 1]);
  }

  function handleNext() {
    const currentIndex = stepIndex(currentStep);

    if (currentStep === "welcome" && !selectedGradeBand) {
      return;
    }

    if (currentIndex >= studentOnboardingStepIds.length - 1) {
      return;
    }

    moveToStep(studentOnboardingStepIds[currentIndex + 1]);
  }

  function handleStartProject() {
    if (!selectedMission || !activeLane || !selectedGradeBand) {
      return;
    }

    const href = buildGuidedProjectHref({
      lane: activeLane,
      issueId: selectedMission.issue.id,
      teamId: selectedMission.teamId,
      supportingProposalId:
        activeLane === "POLICY_REFORM_ARCHITECTS"
          ? selectedMission.supportingProposalId
          : null
    });

    startTransition(async () => {
      await completeOnboardingAction({
        gradeBand: selectedGradeBand,
        onboardingVersion: CURRENT_STUDENT_ONBOARDING_VERSION,
        selectedMissionId: selectedMission.issue.id,
        selectedLane: activeLane
      });
      router.push(href);
      router.refresh();
    });
  }

  function handleFinishWithoutMission() {
    if (!selectedGradeBand) {
      return;
    }

    startTransition(async () => {
      await completeOnboardingAction({
        gradeBand: selectedGradeBand,
        onboardingVersion: CURRENT_STUDENT_ONBOARDING_VERSION
      });
      router.push("/issues");
      router.refresh();
    });
  }

  const currentIndex = stepIndex(currentStep);
  const stepMeta = stepCopy[currentStep];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="panel p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
              Student universe tour
            </p>
            <h2 className="mt-4 font-display text-4xl text-ink">
              Learn the world before you open your first draft
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-ink/72">
              This tour shows the whole student-side universe in five small stops, then hands you
              into one real beginner mission.
            </p>
          </div>

          {mode === "replay" ? (
            <Link
              href="/start"
              className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
            >
              Back to mission hub
            </Link>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white/65 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Track</p>
            <p className="mt-3 font-medium text-ink">
              {selectedGradeBand ? gradeBandLabels[selectedGradeBand] : "Choose in Step 1"}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white/65 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Linked team</p>
            <p className="mt-3 font-medium text-ink">
              {data.linkedTeam?.name ?? "League-wide start"}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white/65 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Live issues</p>
            <p className="mt-3 font-medium text-ink">{data.stats.openIssuesCount} open right now</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
        <WizardStepRail
          items={studentOnboardingStepIds.map((step, index) => ({
            id: step,
            title: stepCopy[step].title,
            shortTitle: stepCopy[step].shortTitle,
            status:
              index < currentIndex ? "done" : index === currentIndex ? "strong" : "not_started",
            current: step === currentStep,
            disabled: index > visitedUntil
          }))}
          onSelect={(step) => moveToStep(step)}
        />

        <div className="space-y-6">
          <section className="rounded-[28px] border border-line bg-panel/90 p-6 shadow-panel">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
              {stepMeta.eyebrow}
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="font-display text-3xl text-ink">{stepMeta.title}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
                  {stepMeta.description}
                </p>
              </div>
              <span className="rounded-full border border-line bg-white/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
                {currentIndex + 1} of {studentOnboardingStepIds.length}
              </span>
            </div>
          </section>

          {currentStep === "welcome" ? (
            <section className="space-y-6">
              <div className="panel p-6">
                <h4 className="font-display text-2xl text-ink">Choose the section your class uses</h4>
                <p className="mt-3 text-sm leading-6 text-ink/70">
                  This changes how much help shows up at once. You can change it later, but picking
                  it now makes the first project feel much more natural.
                </p>
                {data.linkedTeam ? (
                  <p className="mt-3 text-sm leading-6 text-ink/62">
                    Your account is linked to <span className="font-medium text-ink">{data.linkedTeam.name}</span>,
                    so some missions will feel easier because they already have a team anchor.
                  </p>
                ) : null}

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {Object.entries(gradeBandLabels).map(([value, label]) => {
                    const selected = selectedGradeBand === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleGradeBandChange(value as keyof typeof gradeBandLabels)}
                        className={`rounded-2xl border p-5 text-left transition ${
                          selected
                            ? "border-accent bg-accent/8"
                            : "border-line bg-white/75 hover:border-accent"
                        }`}
                      >
                        <p className="font-medium text-ink">{label}</p>
                        <p className="mt-2 text-sm leading-6 text-ink/68">
                          {gradeBandDescriptions[value as keyof typeof gradeBandDescriptions]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  "1. Learn what each big part of the universe is for.",
                  "2. See how live issues become student work.",
                  "3. Start one guided project instead of opening every page."
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-line bg-white/70 p-4 text-sm leading-6 text-ink/68"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {currentStep === "universe" ? (
            <section className="grid gap-4 md:grid-cols-2">
              {universeCards.map((card) => (
                <article key={card.id} className="panel p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-display text-2xl text-ink">{card.title}</p>
                    <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${timingTone(card.timing)}`}>
                      {card.timing === "use_now" ? "Use now" : "Use later"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/70">{card.summary}</p>
                  <p className="mt-3 text-sm leading-6 text-ink/62">{card.whyItMatters}</p>
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-white/75 px-4 py-3 text-sm">
                    <span className="text-ink/60">{card.statLabel}</span>
                    <span className="font-medium text-ink">{card.statValue}</span>
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          {currentStep === "problems" ? (
            <section className="space-y-6">
              <div className="panel p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
                      Issues board
                    </p>
                    <h4 className="mt-3 font-display text-2xl text-ink">
                      Live league problems become student missions
                    </h4>
                  </div>
                  <Link
                    href="/issues"
                    className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
                  >
                    Open issues board
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-line bg-white/70 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Open issues</p>
                    <p className="mt-3 font-display text-3xl text-ink">{data.stats.openIssuesCount}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/70 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Recommended now</p>
                    <p className="mt-3 font-display text-3xl text-ink">{data.missionCandidates.length}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/70 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Team anchor</p>
                    <p className="mt-3 text-sm font-medium text-ink">
                      {data.linkedTeam?.name ?? "League-wide"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {data.missionCandidates.length > 0 ? (
                  data.missionCandidates.map((mission) => {
                    const selected = mission.issue.id === selectedMission?.issue.id;

                    return (
                      <button
                        key={mission.issue.id}
                        type="button"
                        onClick={() => handleMissionChange(mission.issue.id)}
                        className={`rounded-[28px] border p-6 text-left transition ${
                          selected
                            ? "border-accent bg-accent/6 shadow-panel"
                            : "border-line bg-white/70 hover:border-accent"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h4 className="font-display text-2xl text-ink">{mission.issue.title}</h4>
                          <span className="rounded-full border border-line bg-white/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
                            Severity {mission.issue.severity}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-ink/70">{mission.reason}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-accent">
                          Suggested lane: {mission.suggestedLane.replaceAll("_", " ")}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[28px] border border-dashed border-line bg-white/70 p-6 text-sm leading-6 text-ink/65">
                    There are no recommended missions right now, but the issues board can still
                    help you pick a live problem manually.
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {currentStep === "work" ? (
            <section className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {workCards.map((card) => (
                  <article key={card.id} className="panel p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-display text-2xl text-ink">{card.title}</p>
                      <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${timingTone(card.timing)}`}>
                        {card.timing === "use_now" ? "Use now" : "Use later"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink/70">{card.summary}</p>
                    <p className="mt-3 text-sm leading-6 text-ink/62">{card.whyItMatters}</p>
                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-white/75 px-4 py-3 text-sm">
                      <span className="text-ink/60">{card.statLabel}</span>
                      <span className="font-medium text-ink">{card.statValue}</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="panel p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
                  Important order
                </p>
                <h4 className="mt-3 font-display text-2xl text-ink">
                  First project first, advanced work second
                </h4>
                <p className="mt-3 text-sm leading-6 text-ink/70">
                  The universe has more than one kind of work, but your first job is still the same:
                  start one guided project, finish a real draft, and only then branch into memo,
                  challenge, or archive-heavy work.
                </p>
              </div>
            </section>
          ) : null}

          {currentStep === "mission" ? (
            data.missionCandidates.length > 0 ? (
              <StudentMissionPicker
                missions={data.missionCandidates}
                linkedTeamName={data.linkedTeam?.name ?? null}
                gradeBand={selectedGradeBand || null}
                selectedMissionId={selectedMissionId}
                selectedLane={selectedLane}
                onMissionChange={handleMissionChange}
                onLaneChange={handleLaneChange}
                onStart={handleStartProject}
                isPending={isPending}
                startLabel="Start your first project"
                stepLabel="Step 5"
              />
            ) : (
              <section className="space-y-6">
                <div className="rounded-[28px] border border-line bg-panel/90 p-6 shadow-panel">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
                    Tour complete
                  </p>
                  <h4 className="mt-3 font-display text-3xl text-ink">
                    No recommended mission is loaded yet
                  </h4>
                  <p className="mt-4 text-sm leading-6 text-ink/70">
                    You finished the tour, and the next safe move is to browse the live issues board.
                    That still gives you a real place to start instead of a blank page.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleFinishWithoutMission}
                      disabled={isPending || !selectedGradeBand}
                      className="rounded-full border border-accent bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
                    >
                      Finish and browse issues
                    </button>
                    <Link
                      href="/"
                      className="rounded-full border border-line bg-white/80 px-5 py-3 text-sm font-medium text-ink"
                    >
                      Go home
                    </Link>
                  </div>
                </div>
              </section>
            )
          ) : null}

          {currentStep === "mission" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={isPending}
                className="rounded-full border border-line bg-white/80 px-5 py-3 text-sm font-medium text-ink disabled:opacity-55"
              >
                Previous
              </button>
              {mode === "replay" ? (
                <Link
                  href="/start"
                  className="rounded-full border border-line bg-white/80 px-5 py-3 text-sm font-medium text-ink"
                >
                  Leave replay
                </Link>
              ) : (
                <span className="text-sm text-ink/60">
                  Finish by starting a project or browsing issues.
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0 || isPending}
                className="rounded-full border border-line bg-white/80 px-5 py-3 text-sm font-medium text-ink disabled:opacity-55"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={(currentStep === "welcome" && !selectedGradeBand) || isPending}
                className="rounded-full border border-accent bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
