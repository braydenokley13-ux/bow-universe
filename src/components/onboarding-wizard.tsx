"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  completeOnboardingAction,
  saveStudentGradeBandSelectionAction
} from "@/server/actions";
import { buildGuidedProjectHref } from "@/lib/student-flow";
import { CURRENT_STUDENT_ONBOARDING_VERSION } from "@/lib/student-onboarding";
import {
  gradeBandDescriptions,
  gradeBandLabels,
  laneTagLabels,
  type LaneTag
} from "@/lib/types";
import type { RecommendedMission } from "@/lib/student-flow";

type OnboardingWizardProps = {
  missions: RecommendedMission[];
  markOnboardingComplete?: boolean;
  linkedTeamName?: string | null;
  gradeBand?: keyof typeof gradeBandLabels | null;
};

type StudentMissionPickerProps = {
  missions: RecommendedMission[];
  linkedTeamName?: string | null;
  gradeBand: keyof typeof gradeBandLabels | null;
  selectedMissionId: string;
  selectedLane: LaneTag | null;
  onMissionChange: (missionId: string) => void;
  onLaneChange: (lane: LaneTag) => void;
  onStart: () => void;
  isPending?: boolean;
  startLabel?: string;
  stepLabel?: string;
};

export function StudentMissionPicker({
  missions,
  linkedTeamName,
  gradeBand,
  selectedMissionId,
  selectedLane,
  onMissionChange,
  onLaneChange,
  onStart,
  isPending = false,
  startLabel = "Start this project",
  stepLabel = "Step 2"
}: StudentMissionPickerProps) {
  const router = useRouter();
  const selectedMission = missions.find((mission) => mission.issue.id === selectedMissionId) ?? missions[0] ?? null;
  const laneOptions = selectedMission
    ? [selectedMission.suggestedLane, ...selectedMission.alternateLanes].slice(0, 3)
    : [];
  const activeLane = selectedLane ?? selectedMission?.suggestedLane ?? null;
  const isYoungerTrack = gradeBand === "GRADE_5_6";

  if (missions.length === 0) {
    return (
      <div className="rounded-[28px] border border-line bg-white/70 p-6 shadow-panel">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
          First mission
        </p>
        <h3 className="mt-3 font-display text-3xl text-ink">No first mission is ready yet.</h3>
        <p className="mt-4 text-sm leading-6 text-ink/70">
          There is no recommended mission waiting right now, so the safest next move is to open the
          issues board and choose a live problem there.
        </p>
        <button
          type="button"
          onClick={() => router.push("/issues")}
          className="mt-6 rounded-full border border-accent bg-accent px-5 py-3 text-sm font-medium text-white"
        >
          Browse live issues
        </button>
      </div>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        {missions.map((mission) => {
          const selected = mission.issue.id === selectedMission?.issue.id;

          return (
            <button
              key={mission.issue.id}
              type="button"
              onClick={() => onMissionChange(mission.issue.id)}
              className={`w-full rounded-[28px] border p-6 text-left transition ${
                selected
                  ? "border-accent bg-accent/6 shadow-panel"
                  : "border-line bg-white/70 hover:border-accent"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
                    Recommended issue
                  </p>
                  <h3 className="mt-3 font-display text-2xl text-ink">{mission.issue.title}</h3>
                </div>
                <span className="rounded-full border border-line bg-white/85 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
                  Severity {mission.issue.severity}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-ink/68">{mission.reason}</p>

              {mission.issue.team ? (
                <p className="mt-3 text-sm text-ink/60">
                  Linked team: <span className="font-medium text-ink">{mission.issue.team.name}</span>
                </p>
              ) : null}

              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-accent">
                Suggested lane: {laneTagLabels[mission.suggestedLane]}
              </p>
            </button>
          );
        })}
      </div>

      {selectedMission ? (
        <aside className="rounded-[28px] border border-line bg-panel/85 p-6 shadow-panel">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
            {stepLabel}
          </p>
          <h3 className="mt-3 font-display text-3xl text-ink">Choose how you want to work</h3>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            {isYoungerTrack
              ? "We picked the most natural lane first so you can keep the start small. Switch only if another angle feels much easier."
              : "We picked the most natural lane first. If another one feels better, switch it now."}
          </p>
          {linkedTeamName ? (
            <p className="mt-3 text-sm leading-6 text-ink/62">
              Your linked team is <span className="font-medium text-ink">{linkedTeamName}</span>, so
              that context can help you decide which angle feels simplest.
            </p>
          ) : null}

          <div className="mt-6 space-y-3">
            {laneOptions.map((lane, index) => (
              <button
                key={lane}
                type="button"
                onClick={() => onLaneChange(lane)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  activeLane === lane
                    ? "border-accent bg-accent/10"
                    : "border-line bg-white/75 hover:border-accent"
                }`}
              >
                <p className="font-medium text-ink">{laneTagLabels[lane]}</p>
                <p className="mt-2 text-sm leading-6 text-ink/65">
                  {index === 0
                    ? "Best first match for this issue."
                    : "Use this if you want a different angle on the same problem."}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-white/70 p-4">
            <p className="font-medium text-ink">What happens next</p>
            <p className="mt-2 text-sm leading-6 text-ink/68">
              {isYoungerTrack
                ? "We will open the younger-track guide with this issue already linked, the lane already chosen, and the writing broken into small steps."
                : "We will open a beginner project with this issue already linked, the lane already chosen, and the questions broken into small steps."}
            </p>
          </div>

          <button
            type="button"
            onClick={onStart}
            disabled={isPending || !activeLane || !gradeBand}
            className="mt-6 w-full rounded-full border border-accent bg-accent px-6 py-3 font-medium text-white transition hover:bg-accent/90 disabled:opacity-60"
          >
            {isPending ? "Starting..." : gradeBand ? startLabel : "Choose your section first"}
          </button>
        </aside>
      ) : null}
    </section>
  );
}

export function OnboardingWizard({
  missions,
  markOnboardingComplete = false,
  linkedTeamName,
  gradeBand = null
}: OnboardingWizardProps) {
  const router = useRouter();
  const [selectedMissionId, setSelectedMissionId] = useState(missions[0]?.issue.id ?? "");
  const [selectedLane, setSelectedLane] = useState<LaneTag | null>(
    missions[0]?.suggestedLane ?? null
  );
  const [selectedGradeBand, setSelectedGradeBand] = useState<
    keyof typeof gradeBandLabels | ""
  >(gradeBand ?? "");
  const [isPending, startTransition] = useTransition();

  const selectedMission = missions.find((mission) => mission.issue.id === selectedMissionId) ?? missions[0] ?? null;
  const activeLane = selectedLane ?? selectedMission?.suggestedLane ?? null;

  function handleSelectMission(missionId: string) {
    const mission = missions.find((entry) => entry.issue.id === missionId);
    setSelectedMissionId(missionId);
    setSelectedLane(mission?.suggestedLane ?? null);
  }

  function handleStart() {
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
      if (markOnboardingComplete) {
        await completeOnboardingAction({
          gradeBand: selectedGradeBand,
          onboardingVersion: CURRENT_STUDENT_ONBOARDING_VERSION,
          selectedMissionId: selectedMission.issue.id,
          selectedLane: activeLane
        });
      } else if (selectedGradeBand !== gradeBand) {
        await saveStudentGradeBandSelectionAction({ gradeBand: selectedGradeBand });
      }

      router.push(href);
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-4">
      <div className="panel p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
          Student mission start
        </p>
        <h2 className="mt-4 font-display text-4xl text-ink">
          Start with one clear issue, not a blank page.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-ink/72">
          Pick the class section you are using, look at today&apos;s three small steps, and then
          choose one league problem to begin.
        </p>
        {linkedTeamName ? (
          <p className="mt-3 text-sm leading-6 text-ink/62">
            Your linked team is <span className="font-medium text-ink">{linkedTeamName}</span>, so
            those issues may feel easier to start with.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-line bg-white/70 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 1</p>
            <h3 className="mt-3 font-display text-2xl text-ink">Choose your section</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(gradeBandLabels).map(([value, label]) => {
                const selected = selectedGradeBand === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedGradeBand(value as keyof typeof gradeBandLabels)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected ? "border-accent bg-accent/8" : "border-line bg-white hover:border-accent"
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

          <div className="rounded-2xl border border-line bg-white/70 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">What happens today</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-ink/68">
              <div className="rounded-2xl border border-line bg-white/80 p-4">
                1. Pick one issue that feels manageable.
              </div>
              <div className="rounded-2xl border border-line bg-white/80 p-4">
                2. Answer one small question at a time in the guided project.
              </div>
              <div className="rounded-2xl border border-line bg-white/80 p-4">
                3. Finish with a clear next step instead of a giant report.
              </div>
            </div>
          </div>
        </div>
      </div>

      <StudentMissionPicker
        missions={missions}
        linkedTeamName={linkedTeamName}
        gradeBand={selectedGradeBand || null}
        selectedMissionId={selectedMissionId}
        selectedLane={selectedLane}
        onMissionChange={handleSelectMission}
        onLaneChange={setSelectedLane}
        onStart={handleStart}
        isPending={isPending}
      />
    </div>
  );
}
