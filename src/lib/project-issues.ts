type ProjectIssueLinkLike = {
  issueId?: string | null;
};

export function normalizeProjectIssueId(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveProjectPrimaryIssueId(input: {
  issueId?: string | null;
  issueIds?: Array<string | null | undefined>;
  issueLinks?: ProjectIssueLinkLike[] | null;
}) {
  const candidates = [
    normalizeProjectIssueId(input.issueId),
    ...(input.issueIds ?? []).map((value) => normalizeProjectIssueId(value ?? "")),
    ...((input.issueLinks ?? []).map((link) => normalizeProjectIssueId(link.issueId)) ?? [])
  ];

  return candidates.find(Boolean) ?? "";
}

export function buildProjectIssueLinkCreates(issueId: string) {
  const normalizedIssueId = normalizeProjectIssueId(issueId);

  return normalizedIssueId ? [{ issueId: normalizedIssueId }] : [];
}
