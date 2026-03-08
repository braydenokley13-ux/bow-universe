import type { ReactNode } from "react";

type WizardShellProps = {
  progressTitle: string;
  progressDescription: string;
  documentTitle?: string;
  autosaveMessage: string;
  autosaveTone: "idle" | "saving" | "saved" | "error";
  completedSteps: number;
  totalSteps: number;
  currentStepName?: string;
  coachPanel?: {
    activeLabel?: string;
    rightNow: string;
    whyItMatters: string;
    nextMove: string;
    missingItems: string[];
    strongExample: string;
    beginnerMode?: boolean;
    repairLabel?: string | null;
  };
  rail: ReactNode;
  children: ReactNode;
  footer: ReactNode;
};

function autosaveDisplay(tone: WizardShellProps["autosaveTone"], message: string) {
  if (tone === "error") {
    return {
      className: "rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger",
      text: "Your work wasn't saved. Check your connection and try again."
    };
  }

  if (tone === "saved") {
    return {
      className: "rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success",
      text: `✓ ${message}`
    };
  }

  if (tone === "saving") {
    return {
      className: "rounded-xl border border-line bg-white/70 px-4 py-2.5 text-sm text-ink/68 animate-pulse",
      text: "Saving…"
    };
  }

  return {
    className: "rounded-xl border border-line bg-white/60 px-4 py-2.5 text-sm text-ink/45",
    text: message
  };
}

export function WizardShell({
  progressTitle,
  progressDescription,
  documentTitle,
  autosaveMessage,
  autosaveTone,
  completedSteps,
  totalSteps,
  currentStepName,
  coachPanel,
  rail,
  children,
  footer
}: WizardShellProps) {
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const autosave = autosaveDisplay(autosaveTone, autosaveMessage);

  return (
    <div className="space-y-5">
      {/* Header card */}
      <section className="panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent/80">{progressTitle}</p>
            {documentTitle ? (
              <h2 className="mt-1.5 font-display text-2xl text-ink leading-snug">{documentTitle}</h2>
            ) : (
              <p className="mt-1.5 text-sm leading-6 text-ink/55">{progressDescription}</p>
            )}
            {documentTitle && (
              <p className="mt-1 text-[13px] leading-5 text-ink/50">{progressDescription}</p>
            )}
          </div>

          {/* Autosave badge — right side */}
          <div className="flex-shrink-0">
            <div className={autosave.className}>{autosave.text}</div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-medium text-ink">
                {completedSteps} / {totalSteps} sections
              </span>
              {currentStepName && (
                <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                  {currentStepName}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-ink/40">{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/50">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {coachPanel ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <section className="rounded-[24px] border border-accent/20 bg-accent/5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                {coachPanel.activeLabel ? (
                  <span className="rounded-full border border-accent/30 bg-white/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                    {coachPanel.activeLabel}
                  </span>
                ) : null}
                {coachPanel.beginnerMode ? (
                  <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-success">
                    Beginner mode
                  </span>
                ) : null}
                {coachPanel.repairLabel ? (
                  <span className="rounded-full border border-warn/30 bg-warn/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-warn">
                    Repairing {coachPanel.repairLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Right now</p>
                  <p className="mt-2 text-sm leading-6 text-ink/72">{coachPanel.rightNow}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Why it matters</p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{coachPanel.whyItMatters}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Next move</p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{coachPanel.nextMove}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-line bg-white/70 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Repair guide</p>
              {coachPanel.missingItems.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                  {coachPanel.missingItems.slice(0, 3).map((item) => (
                    <li key={item} className="rounded-2xl border border-line bg-mist/40 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-ink/62">
                  No blockers on this step right now. Tighten the language and keep the section coherent.
                </p>
              )}

              <div className="mt-4 rounded-2xl border border-line bg-white/85 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Strong example</p>
                <p className="mt-2 text-sm leading-6 text-ink/68">{coachPanel.strongExample}</p>
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-20 xl:self-start">{rail}</div>
        <div className="space-y-5">
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
