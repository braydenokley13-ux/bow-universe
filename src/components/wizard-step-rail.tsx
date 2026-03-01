import { getStepStatusLabel, type CoachStepStatus } from "@/lib/coach-ui";

type WizardStepRailProps<StepId extends string> = {
  items: Array<{
    id: StepId;
    title: string;
    shortTitle: string;
    status: CoachStepStatus;
    current: boolean;
    disabled: boolean;
  }>;
  onSelect: (stepId: StepId) => void;
};

function toneForStatus(status: CoachStepStatus, current: boolean) {
  if (current) {
    return "border-accent bg-accent text-white";
  }

  if (status === "done") {
    return "border-success/20 bg-success/10 text-success";
  }

  if (status === "strong") {
    return "border-accent/20 bg-accent/10 text-accent";
  }

  if (status === "needs_work") {
    return "border-warn/20 bg-warn/10 text-warn";
  }

  return "border-line bg-white/75 text-ink/68";
}

export function WizardStepRail<StepId extends string>({
  items,
  onSelect
}: WizardStepRailProps<StepId>) {
  return (
    <nav className="rounded-[28px] border border-line bg-panel/85 p-4 shadow-panel">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Your progress</p>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => onSelect(item.id)}
            className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${toneForStatus(item.status, item.current)} ${
              item.disabled ? "cursor-not-allowed opacity-55" : "hover:border-accent"
            }`}
          >
            <span className="mt-0.5 flex-shrink-0 rounded-full border border-current/30 bg-current/10 px-1.5 py-0.5 font-mono text-[10px] leading-none">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-5">{item.title}</span>
              {item.current ? (
                <span className="mt-1 block text-xs leading-5 font-medium">→ You are here</span>
              ) : (
                <span className="mt-1 block text-xs leading-5 opacity-80">
                  {getStepStatusLabel(item.status)}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
