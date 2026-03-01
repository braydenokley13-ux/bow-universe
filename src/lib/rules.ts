import { z } from "zod";

import type { LeagueRulesV1, RuleDiff } from "@/lib/types";
import { roundTo } from "@/lib/utils";

export const leagueRulesSchema = z.object({
  capGrowthRate: z.number().min(0).max(1),
  luxuryTaxBrackets: z
    .array(
      z.object({
        label: z.string().min(1),
        thresholdMultiplier: z.number().positive().nullable(),
        rate: z.number().min(0)
      })
    )
    .min(1),
  secondApronThreshold: z.number().positive(),
  revenueSharingRate: z.number().min(0).max(1)
});

export const ruleDiffSchema = z.object({
  changes: z.array(
    z.object({
      op: z.enum(["replace", "add", "remove"]),
      path: z.string().min(1),
      value: z.unknown().optional(),
      reason: z.string().optional()
    })
  )
});

const allowedRootPaths = new Set([
  "/capGrowthRate",
  "/luxuryTaxBrackets",
  "/secondApronThreshold",
  "/revenueSharingRate"
]);

export function parseRules(value: unknown) {
  return leagueRulesSchema.parse(value);
}

export function parseRuleDiff(value: unknown) {
  return ruleDiffSchema.parse(value);
}

export function applyRuleDiff(baseRules: LeagueRulesV1, diff: RuleDiff): LeagueRulesV1 {
  const working = structuredClone(baseRules) as Record<string, unknown>;

  for (const change of diff.changes) {
    if (!allowedRootPaths.has(change.path) && !change.path.startsWith("/luxuryTaxBrackets/")) {
      throw new Error(`Illegal rule diff path: ${change.path}`);
    }

    const pathParts = change.path.split("/").filter(Boolean);
    if (pathParts.length === 0) {
      throw new Error("Rule diff path cannot be empty");
    }

    let cursor: Record<string, unknown> | unknown[] = working;

    for (let index = 0; index < pathParts.length - 1; index += 1) {
      const segment = pathParts[index];
      const isArraySegment = Array.isArray(cursor);

      if (isArraySegment) {
        cursor = (cursor as unknown[])[Number(segment)] as Record<string, unknown> | unknown[];
      } else {
        cursor = (cursor as Record<string, unknown>)[segment] as Record<string, unknown> | unknown[];
      }

      if (cursor === undefined) {
        throw new Error(`Rule diff path does not exist: ${change.path}`);
      }
    }

    const lastSegment = pathParts[pathParts.length - 1];
    const targetIsArray = Array.isArray(cursor);

    if (change.op === "remove") {
      if (targetIsArray) {
        (cursor as unknown[]).splice(Number(lastSegment), 1);
      } else {
        delete (cursor as Record<string, unknown>)[lastSegment];
      }
      continue;
    }

    if (targetIsArray) {
      const target = cursor as unknown[];
      if (change.op === "add") {
        target.splice(Number(lastSegment), 0, change.value);
      } else {
        target[Number(lastSegment)] = change.value;
      }
    } else {
      (cursor as Record<string, unknown>)[lastSegment] = change.value;
    }
  }

  return leagueRulesSchema.parse(working);
}

export function diffRules(previous: LeagueRulesV1, next: LeagueRulesV1) {
  const changes: Array<{ label: string; previous: string; next: string }> = [];

  if (previous.capGrowthRate !== next.capGrowthRate) {
    changes.push({
      label: "Salary cap growth rate",
      previous: `${roundTo(previous.capGrowthRate * 100)}%`,
      next: `${roundTo(next.capGrowthRate * 100)}%`
    });
  }

  if (previous.secondApronThreshold !== next.secondApronThreshold) {
    changes.push({
      label: "Second apron threshold",
      previous: `${roundTo(previous.secondApronThreshold * 100)}% of cap`,
      next: `${roundTo(next.secondApronThreshold * 100)}% of cap`
    });
  }

  if (previous.revenueSharingRate !== next.revenueSharingRate) {
    changes.push({
      label: "Revenue sharing rate",
      previous: `${roundTo(previous.revenueSharingRate * 100)}%`,
      next: `${roundTo(next.revenueSharingRate * 100)}%`
    });
  }

  if (JSON.stringify(previous.luxuryTaxBrackets) !== JSON.stringify(next.luxuryTaxBrackets)) {
    changes.push({
      label: "Luxury tax brackets",
      previous: JSON.stringify(previous.luxuryTaxBrackets),
      next: JSON.stringify(next.luxuryTaxBrackets)
    });
  }

  return changes;
}

export function describeRules(rules: LeagueRulesV1) {
  return [
    {
      label: "Cap growth rate",
      value: `${roundTo(rules.capGrowthRate * 100)}%`,
      detail: "How quickly the league salary cap rises from one season to the next."
    },
    {
      label: "Revenue sharing rate",
      value: `${roundTo(rules.revenueSharingRate * 100)}%`,
      detail: "The share of each team's raw revenue that flows into the league sharing pool."
    },
    {
      label: "Second apron threshold",
      value: `${roundTo(rules.secondApronThreshold * 100)}% of cap`,
      detail: "The pressure point where overspending becomes a system-wide issue."
    }
  ];
}
