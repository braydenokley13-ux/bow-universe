import type { LaneTag } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;

export type StudioSearchParams = Record<string, SearchParamValue>;

const VALID_LANES: LaneTag[] = [
  "TOOL_BUILDERS",
  "POLICY_REFORM_ARCHITECTS",
  "STRATEGIC_OPERATORS",
  "ECONOMIC_INVESTIGATORS"
];

function firstValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function cleanId(value: SearchParamValue) {
  return firstValue(value).trim();
}

export function parseProjectStudioPrefill(searchParams: StudioSearchParams) {
  const lane = firstValue(searchParams.lane).trim() as LaneTag;
  const lanePrimary = VALID_LANES.includes(lane) ? lane : null;
  const issueId = cleanId(searchParams.issueId);
  const teamId = cleanId(searchParams.teamId);
  const supportingProposalId = cleanId(searchParams.supportingProposalId);

  return {
    lanePrimary,
    issueIds: issueId ? [issueId] : [],
    teamId,
    supportingProposalId
  };
}

export function parseProposalStudioPrefill(searchParams: StudioSearchParams) {
  return {
    issueId: cleanId(searchParams.issueId)
  };
}

export function buildProjectStudioHref(input: {
  lane?: LaneTag | null;
  issueId?: string | null;
  teamId?: string | null;
  supportingProposalId?: string | null;
}) {
  const params = new URLSearchParams();

  if (input.lane) {
    params.set("lane", input.lane);
  }

  if (input.issueId) {
    params.set("issueId", input.issueId);
  }

  if (input.teamId) {
    params.set("teamId", input.teamId);
  }

  if (input.supportingProposalId) {
    params.set("supportingProposalId", input.supportingProposalId);
  }

  const query = params.toString();
  return query ? `/projects/new?${query}` : "/projects/new";
}

export function buildProposalStudioHref(input: { issueId?: string | null }) {
  if (!input.issueId) {
    return "/proposals/new";
  }

  const params = new URLSearchParams({ issueId: input.issueId });
  return `/proposals/new?${params.toString()}`;
}
