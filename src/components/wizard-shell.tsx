import type { ReactNode } from "react";

type WizardShellProps = {
  progressTitle: string;
  progressDescription: string;
  autosaveMessage: string;
  autosaveTone: "idle" | "saving" | "saved" | "error";
  completedSteps: number;
  totalSteps: number;
  rail: ReactNode;
  children: ReactNode;
  footer: ReactNode;
};

function autosaveToneClass(tone: WizardShellProps["autosaveTone"]) {
  if (tone === "error") {
    return "text-danger";
  }

  if (tone === "saved") {
    return "text-success";
  }

  return "text-ink/68";
}

export function WizardShell({
  progressTitle,
  progressDescription,
  autosaveMessage,
  autosaveTone,
  completedSteps,
  totalSteps,
  rail,
  children,
  footer
}: WizardShellProps) {
  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">Adaptive coach</p>
            <h3 className="mt-3 font-display text-3xl text-ink">{progressTitle}</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/68">{progressDescription}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white/75 px-4 py-3 text-sm text-ink/72">
            {completedSteps} of {totalSteps} steps strong enough to move on
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="font-medium text-ink">How this coach works</p>
            <p className="mt-3 text-sm leading-6 text-ink/68">
              Each screen asks for one small piece of thinking. The coach shows what strong work
              looks like, what is still weak, and what to write next.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="font-medium text-ink">Autosave</p>
            <p className={`mt-3 text-sm leading-6 ${autosaveToneClass(autosaveTone)}`}>
              {autosaveMessage}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-6 xl:self-start">{rail}</div>
        <div className="space-y-6">
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
