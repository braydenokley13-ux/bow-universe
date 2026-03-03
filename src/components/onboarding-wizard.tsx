"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { completeOnboardingAction } from "@/server/actions";

type Lane = {
  id: string;
  label: string;
  tagline: string;
  detail: string;
};

const LANES: Lane[] = [
  {
    id: "TOOL_BUILDERS",
    label: "Tool Builders",
    tagline: "Build calculators and models teams can use.",
    detail: "You'll create spreadsheets, trackers, and analysis tools that help teams understand their payroll, tax exposure, and competitive position."
  },
  {
    id: "POLICY_REFORM_ARCHITECTS",
    label: "Policy Reform Architects",
    tagline: "Draft proposals to change the rules.",
    detail: "You'll identify problems in the league's rules, design reforms, model their impact in the sandbox, and submit formal policy memos."
  },
  {
    id: "STRATEGIC_OPERATORS",
    label: "Strategic Operators",
    tagline: "Advise teams on roster and financial decisions.",
    detail: "You'll write strategy dossiers for specific teams — analyzing their contracts, market position, and what moves could improve their situation."
  },
  {
    id: "ECONOMIC_INVESTIGATORS",
    label: "Economic Investigators",
    tagline: "Research the numbers behind league inequality.",
    detail: "You'll dig into revenue data, tax patterns, and competitive balance metrics to write research briefs that explain what's really happening in the league."
  }
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<"welcome" | "lanes" | "confirm">("welcome");
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLaneSelect(lane: Lane) {
    setSelectedLane(lane);
    setStep("confirm");
  }

  function handleStart() {
    if (!selectedLane) return;
    startTransition(async () => {
      await completeOnboardingAction();
      router.push(`/projects/new?lane=${selectedLane.id}`);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      {step === "welcome" && (
        <div className="panel p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">BOW League Research Terminal</p>
          <h2 className="mt-4 font-display text-3xl text-ink">Welcome to the BOW League.</h2>
          <p className="mt-4 text-base leading-7 text-ink/70">
            You&apos;re joining a fictional sports-economy league as a researcher. Your job is to study what&apos;s
            happening, propose changes, build tools, or advise teams — depending on the lane you pick.
          </p>
          <p className="mt-3 text-base leading-7 text-ink/70">
            This isn&apos;t a game. It&apos;s a research environment. The league has real numbers, real problems, and
            real decisions that need student input.
          </p>
          <button
            onClick={() => setStep("lanes")}
            className="mt-8 rounded-full border border-accent bg-accent px-6 py-3 font-medium text-white transition hover:bg-accent/90"
          >
            Pick your research lane →
          </button>
        </div>
      )}

      {step === "lanes" && (
        <div className="space-y-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">Step 1 of 1</p>
            <h2 className="mt-3 font-display text-3xl text-ink">Choose your research lane.</h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              Each lane has different work. Pick the one that sounds most interesting to you — you can always explore the others later.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {LANES.map((lane) => (
              <button
                key={lane.id}
                onClick={() => handleLaneSelect(lane)}
                className="panel group p-6 text-left transition hover:border-accent"
              >
                <p className="font-display text-xl text-ink group-hover:text-accent">{lane.label}</p>
                <p className="mt-2 text-sm font-medium leading-6 text-ink/80">{lane.tagline}</p>
                <p className="mt-3 text-sm leading-6 text-ink/60">{lane.detail}</p>
                <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-accent opacity-0 transition group-hover:opacity-100">
                  Choose this lane →
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "confirm" && selectedLane && (
        <div className="panel p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">You picked</p>
          <h2 className="mt-3 font-display text-3xl text-ink">{selectedLane.label}</h2>
          <p className="mt-4 text-base leading-7 text-ink/70">{selectedLane.detail}</p>
          <p className="mt-3 text-base leading-7 text-ink/70">
            When you click below, you&apos;ll open the project studio and start your first piece of work in this lane.
            You don&apos;t have to finish it today — everything autosaves as you go.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={handleStart}
              disabled={isPending}
              className="rounded-full border border-accent bg-accent px-6 py-3 font-medium text-white transition hover:bg-accent/90 disabled:opacity-60"
            >
              {isPending ? "Starting…" : `Start my first ${selectedLane.label} project →`}
            </button>
            <button
              onClick={() => setStep("lanes")}
              className="text-sm text-ink/55 hover:text-ink"
            >
              ← Go back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
