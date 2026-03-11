import { formatPercent } from "@/lib/utils";

const issueMetricConfig = {
  revenueInequality: {
    label: "Revenue inequality",
    format: (value: number) => value.toFixed(2),
    buildEvidenceLine: (value: number) =>
      `Revenue inequality is at ${value.toFixed(2)}, so the biggest revenue clubs still have a wider money advantage than the lowest-revenue teams.`,
    detail: "Use this when the issue is about rich teams pulling away from the rest of the league."
  },
  taxConcentration: {
    label: "Tax concentration",
    format: (value: number) => formatPercent(value),
    buildEvidenceLine: (value: number) =>
      `Tax concentration is ${formatPercent(value)}, which means a small group of teams is carrying most of the league's tax burden.`,
    detail: "Use this when a few contenders are taking on most of the financial pressure."
  },
  parityIndex: {
    label: "Parity index",
    format: (value: number) => value.toFixed(1),
    buildEvidenceLine: (value: number) =>
      `The parity index is ${value.toFixed(1)}, so team strength is not spreading evenly across the league right now.`,
    detail: "Use this when you need a number that shows how balanced or uneven the league feels."
  },
  smallVsBigCompetitiveness: {
    label: "Small vs big competitiveness",
    format: (value: number) => value.toFixed(2),
    buildEvidenceLine: (value: number) =>
      `Small-vs-big competitiveness is ${value.toFixed(2)}, which suggests smaller markets have less competitive breathing room than larger ones.`,
    detail: "Use this when the issue is about whether smaller clubs can keep up over time."
  }
} as const;

type IssueMetricKey = keyof typeof issueMetricConfig;

type IssueMetricsRecord = Partial<Record<IssueMetricKey, number>> & {
  triggerReason?: string;
};

export type IssueMetricEvidenceCard = {
  key: IssueMetricKey;
  label: string;
  valueLabel: string;
  evidenceLine: string;
  detail: string;
};

function normalizeLine(value: string) {
  return value.trim().replace(/^[-*]\s+/, "");
}

export function parseIssueEvidenceNotes(evidenceMd: string | null | undefined) {
  return String(evidenceMd ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

export function buildIssueMetricEvidenceCards(metrics: unknown) {
  const record = (metrics ?? {}) as IssueMetricsRecord;

  return (Object.keys(issueMetricConfig) as IssueMetricKey[])
    .filter((key) => typeof record[key] === "number" && Number.isFinite(record[key]))
    .map((key) => ({
      key,
      label: issueMetricConfig[key].label,
      valueLabel: issueMetricConfig[key].format(record[key] as number),
      evidenceLine: issueMetricConfig[key].buildEvidenceLine(record[key] as number),
      detail: issueMetricConfig[key].detail
    }));
}

export function getIssueTriggerReason(metrics: unknown) {
  const record = (metrics ?? {}) as IssueMetricsRecord;
  return typeof record.triggerReason === "string" ? record.triggerReason.trim() : "";
}

export function appendEvidenceNote(currentValue: string, nextNote: string) {
  const normalizedNext = normalizeLine(nextNote);
  if (!normalizedNext) {
    return currentValue;
  }

  const existingLines = String(currentValue)
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  if (existingLines.includes(normalizedNext)) {
    return currentValue.trim();
  }

  const nextLine = `- ${normalizedNext}`;
  return currentValue.trim() ? `${currentValue.trim()}\n${nextLine}` : nextLine;
}

export function appendReferenceLine(currentValue: string, nextLine: string) {
  const trimmedNext = nextLine.trim();
  if (!trimmedNext) {
    return currentValue;
  }

  const existingLines = String(currentValue)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (existingLines.includes(trimmedNext)) {
    return currentValue.trim();
  }

  return currentValue.trim() ? `${currentValue.trim()}\n${trimmedNext}` : trimmedNext;
}

export function buildIssueReferenceLine(issue: { id: string; slug?: string | null; title: string }) {
  const issuePath = issue.slug?.trim() || issue.id;
  return `${issue.title} issue file | https://bow.local/issues/${issuePath} | ARTICLE | Starting evidence notes and issue background.`;
}

export function countNonEmptyLines(value: string) {
  return String(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}
