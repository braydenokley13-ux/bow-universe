import { gradeBandDescriptions, gradeBandLabels } from "@/lib/types";
import type { activateStudentInviteAction } from "@/server/actions";

type StudentActivationFormProps = {
  action: typeof activateStudentInviteAction;
  token: string;
  initialGradeBand?: keyof typeof gradeBandLabels | null;
};

export function StudentActivationForm({
  action,
  token,
  initialGradeBand = null
}: StudentActivationFormProps) {
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <label htmlFor="gradeBand" className="block font-mono text-xs uppercase tracking-[0.22em] text-accent">
          Grade band
        </label>
        <select
          id="gradeBand"
          name="gradeBand"
          defaultValue={initialGradeBand ?? ""}
          className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">Choose your section</option>
          {Object.entries(gradeBandLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-xs leading-5 text-ink/60">
          {initialGradeBand
            ? `Your account is currently set to ${gradeBandLabels[initialGradeBand]}. You can change it here if needed.`
            : `${gradeBandLabels.GRADE_5_6}: ${gradeBandDescriptions.GRADE_5_6} ${gradeBandLabels.GRADE_7_8}: ${gradeBandDescriptions.GRADE_7_8}`}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block font-mono text-xs uppercase tracking-[0.22em] text-accent">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="block font-mono text-xs uppercase tracking-[0.22em] text-accent">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          minLength={8}
          className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white"
      >
        Activate account
      </button>
    </form>
  );
}
