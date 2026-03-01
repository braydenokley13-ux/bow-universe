"use client";

import { useState } from "react";

import {
  getFieldStateLabel,
  type CoachFieldEvaluationLike,
  type CoachFieldState
} from "@/lib/coach-ui";

import { ExampleCompareCard } from "./example-compare-card";
import { StarterChipRow } from "./starter-chip-row";

type FieldCoachProps = {
  evaluation: CoachFieldEvaluationLike;
  onUseStarter?: (starter: string) => void;
};

function toneForState(state: CoachFieldState) {
  switch (state) {
    case "ready":
      return "border-success/30 bg-success/10 text-success";
    case "strong":
      return "border-accent/25 bg-accent/10 text-accent";
    case "developing":
      return "border-warn/30 bg-warn/10 text-warn";
    case "starting":
      return "border-warn/30 bg-warn/10 text-warn";
    default:
      return "border-line bg-white/80 text-ink/65";
  }
}

export function FieldCoach({ evaluation, onUseStarter }: FieldCoachProps) {
  const [showStarters, setShowStarters] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const starterItems = showStarters ? evaluation.starters : evaluation.starters.slice(0, 2);
  const fastFix = evaluation.missingIngredients[0] ?? evaluation.recipe[0] ?? evaluation.nextMove;

  return (
    <div className="mt-4 rounded-2xl border border-line bg-panel/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-ink">Coach feedback</p>
          <p className="mt-2 text-sm leading-6 text-ink/68">{evaluation.message}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] ${toneForState(evaluation.state)}`}>
          {getFieldStateLabel(evaluation.state)}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3">
        <p className="font-medium text-ink">Fast fix</p>
        <p className="mt-2 text-sm leading-6 text-ink/68">{fastFix}</p>
      </div>

      {starterItems.length > 0 && onUseStarter ? (
        <div className="mt-4">
          <p className="font-medium text-ink">Start here</p>
          <StarterChipRow starters={starterItems} onSelect={onUseStarter} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {evaluation.starters.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowStarters((current) => !current)}
            className="rounded-full border border-line bg-white/80 px-3 py-2 text-xs font-semibold text-ink"
          >
            {showStarters ? "Show fewer starters" : "Show more starters"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setShowExamples((current) => !current)}
          className="rounded-full border border-line bg-white/80 px-3 py-2 text-xs font-semibold text-ink"
        >
          Show me a stronger version
        </button>
        <button
          type="button"
          onClick={() => setShowChecklist((current) => !current)}
          className="rounded-full border border-line bg-white/80 px-3 py-2 text-xs font-semibold text-ink"
        >
          Tell me what I forgot
        </button>
      </div>

      {showExamples ? (
        <ExampleCompareCard
          weakExample={evaluation.weakExample}
          strongExample={evaluation.strongExample}
        />
      ) : null}

      {showChecklist ? (
        <div className="mt-4 rounded-2xl border border-line bg-white/70 p-4">
          <p className="font-medium text-ink">What strong answers include</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
            {(evaluation.missingIngredients.length > 0
              ? evaluation.missingIngredients
              : evaluation.recipe
            ).map((item) => (
              <li key={item} className="rounded-2xl border border-line bg-white/80 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-line bg-white/70 px-4 py-3">
        <p className="font-medium text-ink">Next move</p>
        <p className="mt-2 text-sm leading-6 text-ink/68">{evaluation.nextMove}</p>
      </div>
    </div>
  );
}
