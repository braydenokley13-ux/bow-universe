import { cn } from "@/lib/utils";

type Milestone = {
  label: string;
  complete: boolean;
};

function deriveMilestones(outcomeStats: {
  realArtifacts: number;
  evidenceBacked: number;
  verifiedImpact: number;
}): Milestone[] {
  return [
    { label: "Make something real", complete: outcomeStats.realArtifacts > 0 },
    { label: "Back it with evidence", complete: outcomeStats.evidenceBacked > 0 },
    { label: "Get it verified", complete: outcomeStats.verifiedImpact > 0 }
  ];
}

type StudentProgressStripProps = {
  outcomeStats: {
    realArtifacts: number;
    evidenceBacked: number;
    verifiedImpact: number;
  };
};

export function StudentProgressStrip({ outcomeStats }: StudentProgressStripProps) {
  const milestones = deriveMilestones(outcomeStats);
  const currentIndex = milestones.findIndex((m) => !m.complete);
  const activeIndex = currentIndex === -1 ? milestones.length - 1 : currentIndex;

  return (
    <section className="panel p-5">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Your progress</p>
      <div className="mt-4 flex flex-wrap items-start gap-0">
        {milestones.map((milestone, index) => {
          const isComplete = milestone.complete;
          const isActive = index === activeIndex && !isComplete;
          const isFuture = !isComplete && !isActive;

          return (
            <div key={milestone.label} className="flex flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex w-full items-center">
                  {index > 0 && (
                    <div
                      className={cn(
                        "h-px flex-1",
                        isComplete ? "bg-accent" : "bg-line"
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "h-4 w-4 shrink-0 rounded-full border-2",
                      isComplete
                        ? "border-accent bg-accent"
                        : isActive
                          ? "border-accent bg-white ring-2 ring-accent ring-offset-2"
                          : "border-line bg-white/70"
                    )}
                  />
                  {index < milestones.length - 1 && (
                    <div
                      className={cn(
                        "h-px flex-1",
                        isComplete ? "bg-accent" : "bg-line"
                      )}
                    />
                  )}
                </div>
                <p
                  className={cn(
                    "px-1 text-center text-xs leading-4",
                    isComplete
                      ? "font-medium text-accent"
                      : isActive
                        ? "font-medium text-ink"
                        : "text-ink/45"
                  )}
                >
                  {milestone.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
