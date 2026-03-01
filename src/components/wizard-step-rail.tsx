import {
  getStepStatusLabel,
  type ProposalCoachStepId,
  type ProposalCoachStepStatus
} from "@/lib/proposal-wizard";

type WizardStepRailProps = {
  items: Array<{
    id: ProposalCoachStepId;
    title: string;
    shortTitle: string;
    status: ProposalCoachStepStatus;
    current: boolean;
    disabled: boolean;
  }>;
  onSelect: (stepId: ProposalCoachStepId) => void;
};

function toneForStatus(status: ProposalCoachStepStatus, current: boolean) {
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

export function WizardStepRail({ items, onSelect }: WizardStepRailProps) {
  return (
    <nav className="rounded-[28px] border border-line bg-panel/85 p-4 shadow-panel">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Coach path</p>
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
            <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{item.title}</span>
              <span className="mt-1 block text-xs leading-5 opacity-80">
                {getStepStatusLabel(item.status)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
