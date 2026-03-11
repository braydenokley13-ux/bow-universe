import { ProposalStatus, SubmissionStatus, UserRole } from "@prisma/client";

import { buildResearchStageDisplay, type ResearchStageProgress } from "@/lib/research-stage";
import type { LaneTag } from "@/lib/types";

export type ActionHint = {
  label: string;
  href: string;
  detail: string;
  tone?: "default" | "success" | "warn";
};

export type DiscoveryGuidanceCard = {
  title: string;
  detail: string;
  href: string;
  eyebrow?: string;
  tone?: "default" | "success" | "warn";
};

type DashboardInput = {
  viewerRole?: UserRole | null;
  viewerId?: string | null;
  proposals: Array<{
    id: string;
    title: string;
    status: ProposalStatus;
    createdByUserId: string;
  }>;
  projects: Array<{
    id: string;
    title: string;
    submissionStatus: SubmissionStatus;
    createdByUserId: string;
  }>;
  issues: Array<{
    id: string;
    title: string;
    severity: number;
    proposals: unknown[];
    projectLinks: unknown[];
  }>;
  publications: Array<{
    slug: string;
    title: string;
  }>;
};

type IssueGapInput = {
  id: string;
  title: string;
  proposals: Array<{ id: string }>;
  projectLinks: Array<{ project: { id: string } }>;
};

type IssueResearchPreviewInput = IssueGapInput & {
  description: string;
  severity: number;
  team?: { name: string } | null;
  metrics?: {
    revenueInequality?: number | null;
    taxConcentration?: number | null;
    parityIndex?: number | null;
    smallVsBigCompetitiveness?: number | null;
  };
};

export type IssueResearchPreview = {
  questionPrompt: string;
  evidencePrompt: string;
  modelPrompt: string;
  argumentPrompt: string;
  whyInteresting: string;
  nextStepDetail: string;
  researchMap: ResearchStageProgress;
};

export function summarizeIssuesFilter(status: string, severity: string, count: number) {
  const parts = [];

  if (status !== "ALL") {
    parts.push(status.replaceAll("_", " ").toLowerCase());
  }

  if (severity !== "ALL") {
    parts.push(`severity ${severity}+`);
  }

  if (parts.length === 0) {
    return `${count} issues in the board`;
  }

  return `${count} issues matching ${parts.join(" and ")}`;
}

export function classifyIssueWorkGap(issue: IssueGapInput) {
  const hasProposal = issue.proposals.length > 0;
  const hasProject = issue.projectLinks.length > 0;

  if (!hasProposal && !hasProject) {
    return {
      summary: "No proposal memo or supporting project is linked yet.",
      missing: ["proposal memo", "supporting project"]
    };
  }

  if (!hasProposal) {
    return {
      summary: "This issue has supporting work, but no policy memo yet.",
      missing: ["proposal memo"]
    };
  }

  if (!hasProject) {
    return {
      summary: "This issue has a memo, but no supporting project yet.",
      missing: ["supporting project"]
    };
  }

  return {
    summary: "This issue already has both memo and project coverage.",
    missing: []
  };
}

function strongestIssueMetric(input: IssueResearchPreviewInput["metrics"]) {
  if (!input) {
    return null;
  }

  const entries = [
    ["Revenue inequality", input.revenueInequality],
    ["Tax concentration", input.taxConcentration],
    ["Parity index", input.parityIndex],
    ["Small vs big balance", input.smallVsBigCompetitiveness]
  ]
    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]));

  return entries[0] ?? null;
}

export function buildIssueResearchPreview(issue: IssueResearchPreviewInput): IssueResearchPreview {
  const gap = classifyIssueWorkGap(issue);
  const metric = strongestIssueMetric(issue.metrics);
  const issueText = `${issue.title} ${issue.description}`.toLowerCase();
  const teamName = issue.team?.name ?? null;
  const pressureTarget = teamName ? `${teamName} can make` : "teams across the league can make";
  const ruleDriven = /(rule|policy|tax|apron|revenue|sharing|cap|penalt)/.test(issueText);

  const questionPrompt = teamName
    ? `How is this issue changing the choices ${pressureTarget}?`
    : "How is this issue changing league balance, spending behavior, or planning freedom?";
  const evidencePrompt = metric
    ? `Start with ${metric[0].toLowerCase()} at ${metric[1]}. Then add one team example, rule note, or league comparison that helps explain why that signal matters.`
    : "Start with one rule note, team example, or league comparison that helps a reader see the pressure quickly.";
  const modelPrompt = ruleDriven
    ? "Later you could test what happens if the league changes this rule pressure and watch parity, tax concentration, or the money gap move."
    : teamName
      ? `Later you could compare what happens if ${teamName} gains or loses one planning tool and see how the pressure shifts.`
      : "Later you could test a simple system change and compare how the league pressure moves before and after the adjustment.";
  const argumentPrompt = gap.missing.includes("proposal memo")
    ? "After the evidence and system test, you should be able to argue what the league should change, protect, or study next."
    : "After the evidence and system test, you should be able to argue what the next team or league move should be."
  ;
  const whyInteresting =
    issue.severity >= 4
      ? "This is a strong mission because the pressure is already high enough that the stakes are easy to feel."
      : teamName
        ? "This is a useful mission because one real team gives the research a clear place to start."
        : "This is a manageable mission because the issue is active, specific, and easier to explain than a blank topic.";
  const nextStepDetail = gap.missing.includes("supporting project")
    ? "Start by building the evidence side of the issue so the league has more than an opinion."
    : "Open the strongest linked work, then tighten the next weak research move instead of starting from zero.";

  return {
    questionPrompt,
    evidencePrompt,
    modelPrompt,
    argumentPrompt,
    whyInteresting,
    nextStepDetail,
    researchMap: buildResearchStageDisplay("ASK_QUESTION", {
      previewStages: ["TEST_SYSTEM"],
      nextStepDetail
    })
  };
}

function isOpenStudentProposal(status: ProposalStatus) {
  return new Set<ProposalStatus>([
    ProposalStatus.DRAFT,
    ProposalStatus.REVISION_REQUESTED,
    ProposalStatus.SUBMITTED
  ]).has(status);
}

function isOpenStudentProject(status: SubmissionStatus) {
  return new Set<SubmissionStatus>([
    SubmissionStatus.DRAFT,
    SubmissionStatus.REVISION_REQUESTED,
    SubmissionStatus.SUBMITTED
  ]).has(status);
}

export function buildDashboardGuidance(input: DashboardInput) {
  const pressureIssues = [...input.issues]
    .sort((left, right) => right.severity - left.severity)
    .slice(0, 3)
    .map((issue) => ({
      title: issue.title,
      detail:
        classifyIssueWorkGap(issue as IssueGapInput).summary ||
        `Severity ${issue.severity} pressure point.`,
      href: `/issues/${issue.id}`,
      eyebrow: `Severity ${issue.severity}`,
      tone: issue.severity >= 4 ? ("warn" as const) : ("default" as const)
    }));

  const studentProposal = input.viewerId
    ? input.proposals.find(
        (proposal) => proposal.createdByUserId === input.viewerId && isOpenStudentProposal(proposal.status)
      )
    : null;
  const studentProject = input.viewerId
    ? input.projects.find(
        (project) => project.createdByUserId === input.viewerId && isOpenStudentProject(project.submissionStatus)
      )
    : null;

  const nextMoves: DiscoveryGuidanceCard[] = [];

  if (studentProposal) {
    nextMoves.push({
      eyebrow: "Resume memo",
      title: studentProposal.title,
      detail: "Return to the adaptive coach and keep the memo moving.",
      href: `/proposals/${studentProposal.id}/edit`,
      tone: "success"
    });
  } else {
    nextMoves.push({
      eyebrow: "Start memo",
      title: "Draft a new proposal memo",
      detail: "Pick a live issue and let the coach walk you through the reform.",
      href: "/proposals/new"
    });
  }

  if (studentProject) {
    nextMoves.push({
      eyebrow: "Resume studio work",
      title: studentProject.title,
      detail: "Open your guided project draft and finish the next weak section.",
      href: `/projects/${studentProject.id}/edit`,
      tone: "success"
    });
  } else {
    nextMoves.push({
      eyebrow: "Start project",
      title: "Open a guided project lane",
      detail: "Choose the lane that fits the kind of work you want to build.",
      href: "/projects/new"
    });
  }

  if ((input.viewerRole ?? null) === UserRole.ADMIN) {
    nextMoves.push({
      eyebrow: "Commissioner",
      title: "Open the review queue",
      detail: "Check proposals, issue cleanup, and archive work that need action now.",
      href: "/admin",
      tone: "warn"
    });
  } else {
    nextMoves.push({
      eyebrow: "Explore",
      title: "Read the archive",
      detail: "Use published work to model the level and structure of strong submissions.",
      href: input.publications[0] ? `/research/${input.publications[0].slug}` : "/research"
    });
  }

  return {
    attentionCards: pressureIssues,
    nextMoveCards: nextMoves
  };
}

export function getLanePrompt(lane: LaneTag) {
  switch (lane) {
    case "TOOL_BUILDERS":
      return "Best when you want to build a tool, calculator, or reusable decision aid.";
    case "POLICY_REFORM_ARCHITECTS":
      return "Best when you want to build reform support work like evidence maps, impact briefs, or structured support for a future memo.";
    case "STRATEGIC_OPERATORS":
      return "Best when you want a team plan with concrete year-by-year moves.";
    default:
      return "Best when you want to investigate an economic pattern and explain what it means.";
  }
}

export function getProposalStageNote(status: ProposalStatus, hasSandbox: boolean) {
  if (!hasSandbox) {
    return "Missing sandbox evidence";
  }

  if (status === ProposalStatus.VOTING) {
    return "In voting";
  }

  if (status === ProposalStatus.DECISION || status === ProposalStatus.READY_FOR_VOTING) {
    return "Awaiting decision";
  }

  if (
    new Set<ProposalStatus>([
      ProposalStatus.PUBLISHED_INTERNAL,
      ProposalStatus.MARKED_EXTERNAL_READY,
      ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
    ]).has(status)
  ) {
    return "Archived";
  }

  return status.replaceAll("_", " ");
}
