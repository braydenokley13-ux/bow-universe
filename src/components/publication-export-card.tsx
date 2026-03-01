import type { updatePublicationExportAction } from "@/server/actions";
import type { ExportTargetState } from "@/lib/publication-queue";
import { Badge } from "@/components/badge";

type PublicationExportCardProps = {
  publicationId: string;
  target: "WEB" | "PDF";
  state: ExportTargetState;
  exportRow?: {
    status: string;
    artifactUrl: string | null;
    notes: string | null;
  };
  action: typeof updatePublicationExportAction;
};

const exportStatuses = ["PLANNED", "IN_PROGRESS", "READY", "GENERATED", "PUBLISHED"] as const;

export function PublicationExportCard({
  publicationId,
  target,
  state,
  exportRow,
  action
}: PublicationExportCardProps) {
  return (
    <form action={action} className="rounded-3xl border border-line bg-white/70 p-4">
      <input type="hidden" name="publicationId" value={publicationId} />
      <input type="hidden" name="target" value={target} />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl text-ink">{target} export</p>
          <p className="mt-1 text-sm text-ink/62">Track the release state for this export target.</p>
        </div>
        <Badge tone={state.enabled ? "success" : "warn"}>{state.status}</Badge>
      </div>

      {state.warning ? (
        <div className="mt-4 rounded-2xl border border-warn/20 bg-warn/10 px-4 py-3 text-sm leading-6 text-ink/72">
          {state.warning}
        </div>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-ink/68">{state.nextAction}</p>

      <div className="mt-4 space-y-3">
        <select
          name="status"
          defaultValue={exportRow?.status ?? state.status}
          className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        >
          {exportStatuses.map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <input
          name="artifactUrl"
          defaultValue={exportRow?.artifactUrl ?? ""}
          placeholder="Optional artifact URL"
          className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />
        <textarea
          name="notes"
          rows={3}
          defaultValue={exportRow?.notes ?? ""}
          placeholder="Short note about what is ready and what still needs work"
          className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Save export row
        </button>
      </div>
    </form>
  );
}
