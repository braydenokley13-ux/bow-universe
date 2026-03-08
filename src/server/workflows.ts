import { IssueStatus, Prisma, ProposalStatus } from "@prisma/client";

import {
  generateIssueAlertArticle,
  generateProposalDecisionArticle,
  generateSeasonAdvanceArticles
} from "@/lib/chronicle";
import { prisma } from "@/lib/prisma";
import { applyRuleDiff, diffRules, parseRuleDiff, parseRules } from "@/lib/rules";
import { calculateLeagueMetrics, compareRuleOutcomes, deriveIssueAlerts, simulateSeason } from "@/lib/sim";
import type { LeagueRulesV1, RuleDiff, SandboxImpactReport, TeamSimulationInput } from "@/lib/types";

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseDiffValue(value: Prisma.JsonValue | null | undefined) {
  return parseRuleDiff((value ?? { changes: [] }) as RuleDiff);
}

function parseRulesValue(value: Prisma.JsonValue | null | undefined) {
  return parseRules(value as LeagueRulesV1);
}

async function getCurrentSeasonWithRules(db: DatabaseClient) {
  const currentSeason = await db.season.findFirst({
    orderBy: { year: "desc" },
    include: {
      activeRuleSet: true
    }
  });

  if (!currentSeason) {
    throw new Error("No season exists in the BOW Universe database.");
  }

  return currentSeason;
}

async function getSimulationInputs(db: DatabaseClient) {
  const teams = await db.team.findMany({
    include: {
      contracts: true
    },
    orderBy: { name: "asc" }
  });

  return teams.map(
    (team): TeamSimulationInput & { contractStartYears: number[]; contractYears: number[] } => ({
      id: team.id,
      name: team.name,
      marketSizeTier: team.marketSizeTier,
      ownerDisciplineScore: team.ownerDisciplineScore,
      salaries: team.contracts.map((contract) => contract.annualSalaryJson as number[]),
      contractStartYears: team.contracts.map((contract) => contract.startYear),
      contractYears: team.contracts.map((contract) => contract.years)
    })
  );
}

export async function createActivityEvent(
  db: DatabaseClient,
  input: {
    type: string;
    title: string;
    summary: string;
    entityType?: string | null;
    entityId?: string | null;
    createdByUserId?: string | null;
    metadata?: unknown;
  }
) {
  return db.activityEvent.create({
    data: {
      type: input.type,
      title: input.title,
      summary: input.summary,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      createdByUserId: input.createdByUserId ?? null,
      metadataJson: input.metadata ? asJson(input.metadata) : Prisma.JsonNull
    }
  });
}

export async function buildSandboxReport(params: {
  db?: DatabaseClient;
  targetRuleSetId: string;
  diff: RuleDiff;
}) {
  const db = params.db ?? prisma;
  const [currentSeason, targetRuleSet, teams] = await Promise.all([
    getCurrentSeasonWithRules(db),
    db.ruleSet.findUnique({
      where: { id: params.targetRuleSetId }
    }),
    getSimulationInputs(db)
  ]);

  if (!targetRuleSet) {
    throw new Error("The target ruleset could not be found.");
  }

  return compareRuleOutcomes({
    currentCap: currentSeason.capNumber,
    nextSeasonYear: currentSeason.year + 1,
    activeRules: parseRulesValue(targetRuleSet.rulesJson),
    diff: params.diff,
    teams
  });
}

export async function runProposalSandboxWorkflow(params: {
  proposalId: string;
  actorUserId: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;
  const proposal = await db.proposal.findUnique({
    where: { id: params.proposalId },
    include: {
      issue: true,
      targetRuleSet: true
    }
  });

  if (!proposal) {
    throw new Error("Proposal not found.");
  }

  const report = await buildSandboxReport({
    db,
    targetRuleSetId: proposal.ruleSetIdTarget,
    diff: parseDiffValue(proposal.diffJson)
  });

  await db.proposal.update({
    where: { id: proposal.id },
    data: {
      sandboxResultJson: asJson(report)
    }
  });

  await createActivityEvent(db, {
    type: "sandbox",
    title: `Sandbox rerun for ${proposal.title}`,
    summary: `A sandbox comparison was run against RuleSet v${proposal.targetRuleSet.version} for the issue "${proposal.issue.title}".`,
    entityType: "Proposal",
    entityId: proposal.id,
    createdByUserId: params.actorUserId,
    metadata: report
  });

  return report;
}

export async function applyDecisionToPendingRuleSetWorkflow(params: {
  proposalId: string;
  actorUserId: string;
  decision: "APPROVE" | "DENY" | "AMEND";
  notes?: string | null;
  amendedDiff?: RuleDiff | null;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;

  const execute = async (tx: DatabaseClient) => {
    const currentSeason = await getCurrentSeasonWithRules(tx);
    const proposal = await tx.proposal.findUnique({
      where: { id: params.proposalId },
      include: {
        issue: true,
        targetRuleSet: true,
        decision: true
      }
    });

    if (!proposal) {
      throw new Error("Proposal not found.");
    }

    const effectiveDiff = params.amendedDiff ?? parseDiffValue(proposal.diffJson);

    await tx.commissionerDecision.upsert({
      where: { proposalId: proposal.id },
      update: {
        decision: params.decision,
        notes: params.notes ?? "",
        decidedByUserId: params.actorUserId,
        decidedAt: new Date(),
        amendedDiffJson:
          params.decision === "AMEND" ? asJson(effectiveDiff) : Prisma.JsonNull
      },
      create: {
        proposalId: proposal.id,
        decision: params.decision,
        notes: params.notes ?? "",
        decidedByUserId: params.actorUserId,
        amendedDiffJson:
          params.decision === "AMEND" ? asJson(effectiveDiff) : Prisma.JsonNull
      }
    });

    await tx.proposal.update({
      where: { id: proposal.id },
      data: {
        status: ProposalStatus.DECISION
      }
    });

    let pendingRuleSetId: string | null = null;

    if (params.decision === "APPROVE" || params.decision === "AMEND") {
      const nextSeasonYear = currentSeason.year + 1;
      const existingPending = await tx.ruleSet.findFirst({
        where: {
          isActive: false,
          effectiveSeasonYear: nextSeasonYear
        },
        orderBy: { version: "desc" }
      });

      const baseRules = existingPending
        ? parseRulesValue(existingPending.rulesJson)
        : parseRulesValue(proposal.targetRuleSet.rulesJson);
      const mergedRules = applyRuleDiff(baseRules, effectiveDiff);
      const activeRules = parseRulesValue(currentSeason.activeRuleSet.rulesJson);
      const changeSummary = diffRules(activeRules, mergedRules);

      if (existingPending) {
        await tx.ruleSet.update({
          where: { id: existingPending.id },
          data: {
            rulesJson: asJson(mergedRules),
            changeSummaryJson: asJson(changeSummary),
            sourceProposalId: proposal.id
          }
        });
        pendingRuleSetId = existingPending.id;
      } else {
        const latestVersion = await tx.ruleSet.aggregate({
          _max: { version: true }
        });
        const pendingRuleSet = await tx.ruleSet.create({
          data: {
            version: (latestVersion._max.version ?? 0) + 1,
            isActive: false,
            rulesJson: asJson(mergedRules),
            changeSummaryJson: asJson(changeSummary),
            effectiveSeasonYear: nextSeasonYear,
            sourceProposalId: proposal.id,
            createdByUserId: params.actorUserId
          }
        });
        pendingRuleSetId = pendingRuleSet.id;
      }
    }

    await createActivityEvent(tx, {
      type: "decision",
      title:
        params.decision === "APPROVE"
          ? `Commissioner approved ${proposal.title}`
          : params.decision === "DENY"
            ? `Commissioner denied ${proposal.title}`
            : `Commissioner amended ${proposal.title}`,
      summary:
        params.decision === "DENY"
          ? `The proposal was closed without a ruleset change. ${params.notes ?? ""}`.trim()
          : `The proposal was folded into the pending next-season RuleSet. ${params.notes ?? ""}`.trim(),
      entityType: "Proposal",
      entityId: proposal.id,
      createdByUserId: params.actorUserId,
      metadata: {
        decision: params.decision,
        pendingRuleSetId
      }
    });

    // Generate a chronicle article for approved/amended proposals
    if (params.decision === "APPROVE" || params.decision === "AMEND") {
      const chronicleArticle = generateProposalDecisionArticle(
        proposal.id,
        proposal.title,
        proposal.issue.title,
        params.decision,
        params.notes
      );
      await tx.chronicleArticle.create({
        data: {
          headline: chronicleArticle.headline,
          body: chronicleArticle.body,
          category: chronicleArticle.category,
          entityType: chronicleArticle.entityType ?? null,
          entityId: chronicleArticle.entityId ?? null,
          seasonId: null,
          teamId: null,
          metadataJson: chronicleArticle.metadataJson
            ? (chronicleArticle.metadataJson as Prisma.InputJsonValue)
            : Prisma.JsonNull
        }
      });
    }

    return pendingRuleSetId;
  };

  if ("$transaction" in db) {
    return db.$transaction(async (tx) => execute(tx));
  }

  return execute(db);
}

async function upsertThresholdIssue(
  db: DatabaseClient,
  input: {
    slug: string;
    title: string;
    description: string;
    severity: number;
    metrics: Record<string, unknown>;
    createdByUserId: string;
  }
) {
  const existing = await db.issue.findUnique({
    where: { slug: input.slug }
  });

  if (existing) {
    await db.issue.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        description: input.description,
        severity: input.severity,
        status: IssueStatus.OPEN,
        metricsJson: asJson(input.metrics)
      }
    });

    return {
      issueId: existing.id,
      reopened: existing.status !== IssueStatus.OPEN
    };
  }

  const created = await db.issue.create({
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: IssueStatus.OPEN,
      metricsJson: asJson(input.metrics),
      createdByUserId: input.createdByUserId
    }
  });

  return {
    issueId: created.id,
    reopened: false
  };
}

export async function advanceSeasonWorkflow(params: {
  actorUserId: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;

  const execute = async (tx: DatabaseClient) => {
    const currentSeason = await getCurrentSeasonWithRules(tx);
    const nextSeasonYear = currentSeason.year + 1;
    const pendingRuleSet = await tx.ruleSet.findFirst({
      where: {
        isActive: false,
        effectiveSeasonYear: nextSeasonYear
      },
      orderBy: { version: "desc" }
    });
    const targetRuleSet = pendingRuleSet ?? currentSeason.activeRuleSet;
    const activeRules = parseRulesValue(targetRuleSet.rulesJson);
    const teams = await getSimulationInputs(tx);
    const simulation = simulateSeason({
      currentCap: currentSeason.capNumber,
      seasonYear: nextSeasonYear,
      rules: activeRules,
      teams
    });

    if (pendingRuleSet) {
      await tx.ruleSet.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
      await tx.ruleSet.update({
        where: { id: pendingRuleSet.id },
        data: {
          isActive: true
        }
      });
    }

    const season = await tx.season.create({
      data: {
        year: nextSeasonYear,
        activeRuleSetId: targetRuleSet.id,
        capNumber: simulation.nextCap
      }
    });

    await tx.teamSeason.createMany({
      data: simulation.teamResults.map((team) => ({
        teamId: team.teamId,
        seasonId: season.id,
        payroll: team.payroll,
        taxPaid: team.taxPaid,
        revenue: team.revenue,
        valuation: team.valuation,
        performanceProxy: team.performanceProxy
      }))
    });

    // Retrieve previous season metrics for chronicle delta story
    const prevSeason = await tx.season.findFirst({
      where: { year: { lt: nextSeasonYear } },
      orderBy: { year: "desc" },
      include: { teamSeasons: { include: { team: true } } }
    });
    const prevMetrics = prevSeason && prevSeason.teamSeasons.length > 0
      ? calculateLeagueMetrics(
          prevSeason.teamSeasons.map((ts) => ({
            teamId: ts.teamId,
            teamName: ts.team.name,
            payroll: ts.payroll,
            taxPaid: ts.taxPaid,
            revenue: ts.revenue,
            valuation: ts.valuation,
            performanceProxy: ts.performanceProxy,
            marketSizeTier: ts.team.marketSizeTier,
            rawRevenue: ts.revenue,
            revenueSharingContribution: 0,
            ownerDisciplineScore: ts.team.ownerDisciplineScore
          }))
        )
      : null;

    const alerts = deriveIssueAlerts(simulation.metrics);

    const issueArticles: Array<{ issueId: string; article: ReturnType<typeof generateIssueAlertArticle> }> = [];

    for (const alert of alerts) {
      const result = await upsertThresholdIssue(tx, {
        slug: alert.slug,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        metrics: alert.metrics,
        createdByUserId: params.actorUserId
      });

      await createActivityEvent(tx, {
        type: "issue",
        title: `${result.reopened ? "Reopened" : "Created"} issue: ${alert.title}`,
        summary: alert.description,
        entityType: "Issue",
        entityId: result.issueId,
        createdByUserId: params.actorUserId,
        metadata: alert.metrics
      });

      if (!result.reopened) {
        issueArticles.push({
          issueId: result.issueId,
          article: generateIssueAlertArticle(result.issueId, alert.title, alert.description, alert.metrics)
        });
      }
    }

    // Generate chronicle articles for this season advance
    const teamResultsForChronicle = simulation.teamResults.map((tr) => {
      const team = teams.find((t) => t.id === tr.teamId);
      return { ...tr, teamName: team?.name ?? tr.teamId };
    });

    const seasonArticles = generateSeasonAdvanceArticles(
      nextSeasonYear,
      season.id,
      teamResultsForChronicle,
      simulation.metrics,
      prevMetrics
    );

    const allArticles = [
      ...seasonArticles,
      ...issueArticles.map((ia) => ia.article)
    ];

    if (allArticles.length > 0) {
      await tx.chronicleArticle.createMany({
        data: allArticles.map((article) => ({
          headline: article.headline,
          body: article.body,
          category: article.category,
          entityType: article.entityType ?? null,
          entityId: article.entityId ?? null,
          seasonId: article.seasonId ?? season.id,
          teamId: article.teamId ?? null,
          metadataJson: article.metadataJson ? (article.metadataJson as Prisma.InputJsonValue) : Prisma.JsonNull
        }))
      });
    }

    await createActivityEvent(tx, {
      type: "season",
      title: `Advanced to season ${nextSeasonYear}`,
      summary: `The league advanced to season ${nextSeasonYear} using RuleSet v${targetRuleSet.version}.`,
      entityType: "Season",
      entityId: season.id,
      createdByUserId: params.actorUserId,
      metadata: {
        metrics: simulation.metrics,
        nextCap: simulation.nextCap
      }
    });

    return {
      seasonId: season.id,
      year: season.year,
      metrics: simulation.metrics
    };
  };

  if ("$transaction" in db) {
    return db.$transaction(async (tx) => execute(tx));
  }

  return execute(db);
}

export function canVoteOnProposal(proposal: {
  status: ProposalStatus;
  voteStart: Date | null;
  voteEnd: Date | null;
}) {
  if (proposal.status !== ProposalStatus.VOTING) {
    return false;
  }

  const now = new Date();

  if (proposal.voteStart && proposal.voteStart > now) {
    return false;
  }

  if (proposal.voteEnd && proposal.voteEnd < now) {
    return false;
  }

  return true;
}
