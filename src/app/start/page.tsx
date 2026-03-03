import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { laneTagLabels, type LaneTag } from "@/lib/types";

type LaneCardDef = {
  lane: LaneTag;
  headline: string;
  description: string;
  href: string;
};

const laneCards: LaneCardDef[] = [
  {
    lane: "TOOL_BUILDERS",
    headline: "Build a tool that helps teams decide",
    description:
      "Create a calculator or model that lets anyone plug in numbers and see how a rule change affects real teams.",
    href: "/projects/new?lane=TOOL_BUILDERS"
  },
  {
    lane: "POLICY_REFORM_ARCHITECTS",
    headline: "Write a memo proposing a rule change",
    description:
      "Pick a league problem, explain what's causing it, propose a fix, and back it up with data from the sandbox.",
    href: "/projects/new?lane=POLICY_REFORM_ARCHITECTS"
  },
  {
    lane: "STRATEGIC_OPERATORS",
    headline: "Make a plan for a specific team",
    description:
      "Choose a team, diagnose where they're stuck, and build a year-by-year strategy to help them compete.",
    href: "/projects/new?lane=STRATEGIC_OPERATORS"
  },
  {
    lane: "ECONOMIC_INVESTIGATORS",
    headline: "Research why the money isn't fair",
    description:
      "Dig into league data, find the pattern that's hurting competitive balance, and write up what you found.",
    href: "/projects/new?lane=ECONOMIC_INVESTIGATORS"
  }
];

export default function StartPage() {
  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Start here"
        title="Welcome to BOW Universe"
        description="BOW Universe is a fictional sports league with real economic problems. Teams are underpaid, rules might be unfair, and the money isn't spread evenly. Your job is to pick a role, investigate a problem, and help fix it."
      />

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-ink">Pick your role</h2>
        <p className="text-sm leading-6 text-ink/68">
          Each role produces a different kind of output. Pick the one that matches how you want to work.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {laneCards.map(({ lane, headline, description, href }) => (
            <Link
              key={lane}
              href={href}
              className="panel block p-5 hover:border-accent"
            >
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
                {laneTagLabels[lane]}
              </p>
              <h3 className="mt-3 font-display text-xl text-ink">{headline}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/68">{description}</p>
              <p className="mt-5 text-xs font-medium text-accent">Start this lane →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-2xl text-ink">Not sure where to start?</h2>
        <p className="mt-3 text-sm leading-6 text-ink/68">
          Browse the open issues first. Each issue is a real problem the league is facing. Reading them will help you pick the right role and find something worth working on.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/issues"
            className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Browse open issues
          </Link>
          <Link
            href="/projects"
            className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
          >
            See what others built
          </Link>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-2xl text-ink">How it works</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "1", title: "Pick a role", body: "Choose which of the four lanes matches what you want to build." },
            { step: "2", title: "Write and save", body: "The wizard walks you through the sections one at a time. Save as you go." },
            { step: "3", title: "Submit for review", body: "When you're ready, submit. Your teacher will give feedback or approve it." },
            { step: "4", title: "Get published", body: "Approved work goes into the research archive for the whole league to read." }
          ].map(({ step, title, body }) => (
            <div key={step} className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step {step}</p>
              <p className="mt-2 font-medium text-ink">{title}</p>
              <p className="mt-2 text-sm leading-6 text-ink/68">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
