import { Badge } from "@/components/badge";

type SourceStatusChipRowProps = {
  sourceLabel: string;
  sourceStatus: string | null | undefined;
  externalReady: boolean;
  externalApproved: boolean;
};

export function SourceStatusChipRow({
  sourceLabel,
  sourceStatus,
  externalReady,
  externalApproved
}: SourceStatusChipRowProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge>{sourceLabel}</Badge>
      <Badge>{sourceStatus?.replaceAll("_", " ") ?? "Unknown source state"}</Badge>
      {externalReady ? <Badge tone="success">External ready</Badge> : <Badge>Internal only</Badge>}
      {externalApproved ? <Badge tone="success">External approved</Badge> : null}
    </div>
  );
}
