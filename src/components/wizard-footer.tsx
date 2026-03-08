type WizardFooterProps = {
  currentStepNumber: number;
  totalSteps: number;
  nextMove: string;
  canGoBack: boolean;
  canGoNext: boolean;
  onSaveDraft: () => void;
  onBack: () => void;
  onNext: () => void;
  submitReady: boolean;
  reviewMode: boolean;
  submitLabel: string;
};

export function WizardFooter({
  currentStepNumber,
  totalSteps,
  nextMove,
  canGoBack,
  canGoNext,
  onSaveDraft,
  onBack,
  onNext,
  submitReady,
  reviewMode,
  submitLabel
}: WizardFooterProps) {
  return (
    <div className="sticky bottom-4 z-20 rounded-[28px] border border-line bg-white/95 p-4 shadow-panel backdrop-blur-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
            Step {currentStepNumber} of {totalSteps}
          </p>
          <p className="mt-2 text-[15px] font-medium leading-6 text-ink/72">{nextMove}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSaveDraft}
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-mist"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>
          {reviewMode ? (
            <button
              type="submit"
              name="intent"
              value="SUBMITTED"
              disabled={!submitReady}
              className="rounded-2xl border-transparent bg-gradient-to-r from-accent to-accent-vivid px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext}
              className="rounded-2xl border-transparent bg-gradient-to-r from-accent to-accent-vivid px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
