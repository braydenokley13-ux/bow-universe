import type { LeagueMetricSnapshot } from "@/lib/types";

export type ChronicleArticleData = {
  headline: string;
  body: string;
  category: "season_advance" | "proposal_approved" | "issue_triggered" | "milestone";
  entityType?: string;
  entityId?: string;
  seasonId?: string;
  teamId?: string;
  metadataJson?: Record<string, unknown>;
};

type TeamResult = {
  teamId: string;
  teamName: string;
  payroll: number;
  taxPaid: number;
  revenue: number;
  performanceProxy: number;
};

function formatM(value: number) {
  return `$${value.toFixed(1)}M`;
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Generates 2-4 news articles after a season advances.
 * Uses pre-written templates with variable slots — no external AI.
 */
export function generateSeasonAdvanceArticles(
  seasonYear: number,
  seasonId: string,
  teamResults: TeamResult[],
  metrics: LeagueMetricSnapshot,
  prevMetrics?: LeagueMetricSnapshot | null
): ChronicleArticleData[] {
  const articles: ChronicleArticleData[] = [];

  // 1. Season advance headline
  const topPayroll = [...teamResults].sort((a, b) => b.payroll - a.payroll)[0];
  articles.push({
    headline: `Season ${seasonYear} is underway — here's what the numbers say`,
    body: `The BOW League has officially entered Season ${seasonYear}. Across the 12-team universe, the average payroll is ${formatM(teamResults.reduce((s, t) => s + t.payroll, 0) / teamResults.length)}. The league parity index sits at ${metrics.parityIndex.toFixed(2)}, and revenue inequality is ${metrics.revenueInequality.toFixed(2)}. ${topPayroll ? `The highest-spending team going into this season is the ${topPayroll.teamName} at ${formatM(topPayroll.payroll)}.` : ""} These numbers are your starting point for any investigation this season.`,
    category: "season_advance",
    entityType: "Season",
    entityId: seasonId,
    seasonId,
    metadataJson: { metrics, seasonYear }
  });

  // 2. Luxury tax story if any team is paying
  const taxpayers = teamResults.filter((t) => t.taxPaid > 0).sort((a, b) => b.taxPaid - a.taxPaid);
  if (taxpayers.length > 0) {
    const top = taxpayers[0];
    const totalTax = taxpayers.reduce((s, t) => s + t.taxPaid, 0);
    articles.push({
      headline: `${top.teamName} leads the league in luxury tax payments in Season ${seasonYear}`,
      body: `The ${top.teamName} paid ${formatM(top.taxPaid)} in luxury tax this season — the highest single-team bill in the league. Across all ${taxpayers.length} taxpaying team${taxpayers.length > 1 ? "s" : ""}, the total tax collected was ${formatM(totalTax)}. A high tax concentration (currently ${metrics.taxConcentration.toFixed(2)}) means a small group of clubs is bearing most of that burden. Is that fair to the league's competitive balance? That's the kind of question economists and policy reformers should be digging into.`,
      category: "season_advance",
      entityType: "Season",
      entityId: seasonId,
      seasonId,
      teamId: top.teamId,
      metadataJson: { topTaxPayer: top, taxpayers: taxpayers.length, totalTax, metrics }
    });
  }

  // 3. Parity shift story if prev metrics available
  if (prevMetrics) {
    const parityDelta = metrics.parityIndex - prevMetrics.parityIndex;
    const direction = parityDelta < -0.5 ? "improved" : parityDelta > 0.5 ? "widened" : "held steady";
    articles.push({
      headline: `Competitive balance ${direction} from last season to Season ${seasonYear}`,
      body: `The parity index moved from ${prevMetrics.parityIndex.toFixed(2)} last season to ${metrics.parityIndex.toFixed(2)} in Season ${seasonYear} — a ${Math.abs(parityDelta).toFixed(2)} point ${parityDelta < 0 ? "decrease" : "increase"}. ${direction === "improved" ? "Teams are clustering closer together in performance, which suggests the current rules may be working as intended." : direction === "widened" ? "The gap between strong and weak teams has grown wider. This is a signal worth investigating — rules that let big spenders pull ahead may be at the root of it." : "Competitive balance didn't change much between seasons. This is useful baseline information when evaluating rule proposals."} Revenue inequality is at ${metrics.revenueInequality.toFixed(2)}, and small-market competitiveness is at ${metrics.smallVsBigCompetitiveness.toFixed(2)}.`,
      category: "season_advance",
      entityType: "Season",
      entityId: seasonId,
      seasonId,
      metadataJson: { metrics, prevMetrics, parityDelta }
    });
  }

  // 4. Revenue sharing story
  const lowestRevenue = [...teamResults].sort((a, b) => a.revenue - b.revenue)[0];
  const highestRevenue = [...teamResults].sort((a, b) => b.revenue - a.revenue)[0];
  if (lowestRevenue && highestRevenue && lowestRevenue.teamId !== highestRevenue.teamId) {
    const ratio = (highestRevenue.revenue / Math.max(lowestRevenue.revenue, 0.01)).toFixed(2);
    articles.push({
      headline: `Revenue inequality at ${metrics.revenueInequality.toFixed(2)} in Season ${seasonYear}: what it means`,
      body: `In Season ${seasonYear}, the ${highestRevenue.teamName} generated ${formatM(highestRevenue.revenue)} in revenue while the ${lowestRevenue.teamName} brought in ${formatM(lowestRevenue.revenue)} — a ${ratio}× gap. The league's revenue inequality score is ${metrics.revenueInequality.toFixed(2)}. Investigators and policy reformers often look at this number to understand whether revenue sharing rules are doing enough to level the playing field. If you're in the Economic Investigators lane, this is a strong starting point for a research question.`,
      category: "season_advance",
      entityType: "Season",
      entityId: seasonId,
      seasonId,
      teamId: lowestRevenue.teamId,
      metadataJson: { metrics, highestRevenue, lowestRevenue, ratio }
    });
  }

  return articles;
}

/**
 * Generates a single article when a commissioner approves or amends a proposal.
 */
export function generateProposalDecisionArticle(
  proposalId: string,
  proposalTitle: string,
  issueTitle: string,
  decision: "APPROVE" | "AMEND",
  notes?: string | null
): ChronicleArticleData {
  const verb = decision === "APPROVE" ? "approved" : "amended and approved";
  const headline =
    decision === "APPROVE"
      ? `Commissioner approved: "${proposalTitle}"`
      : `Commissioner amended and approved: "${proposalTitle}"`;

  const body = [
    `The commissioner has ${verb} the proposal titled "${proposalTitle}", which addresses the league issue "${issueTitle}".`,
    decision === "AMEND"
      ? "The proposal was modified before approval — the final rule change may differ from the original draft. Check the proposal record for the amended diff."
      : "The proposal passed without modification and will be incorporated into the pending ruleset for the next season.",
    notes ? `Commissioner's notes: "${notes}"` : null,
    "This rule change will take effect when the next season advances. Policy reform architects and strategic operators should review how this change might affect their teams and projects."
  ]
    .filter(Boolean)
    .join(" ");

  return {
    headline,
    body,
    category: "proposal_approved",
    entityType: "Proposal",
    entityId: proposalId,
    metadataJson: { decision, proposalTitle, issueTitle }
  };
}

/**
 * Generates an article when a threshold issue is triggered.
 */
export function generateIssueAlertArticle(
  issueId: string,
  issueTitle: string,
  issueDescription: string,
  metrics: Record<string, unknown>
): ChronicleArticleData {
  return {
    headline: `League alert: "${issueTitle}" has been flagged`,
    body: `The BOW League simulation has detected a new pressure point: "${issueTitle}". ${issueDescription} This issue was automatically identified because one or more league metrics crossed a threshold. Metrics at the time of detection: ${Object.entries(metrics)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => `${k}: ${(v as number).toFixed(2)}`)
      .join(", ")}. Students in any research lane can investigate this issue — check the Issues board for more context.`,
    category: "issue_triggered",
    entityType: "Issue",
    entityId: issueId,
    metadataJson: metrics
  };
}
