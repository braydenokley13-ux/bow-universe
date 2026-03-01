import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { getRuleSetsData } from "@/server/data";

export default async function RulesPage() {
  const ruleSets = await getRuleSetsData();
  const activeRuleSet = ruleSets.find((ruleSet) => ruleSet.isActive) ?? ruleSets[0];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Rules"
        title="Versioned rulebook"
        description="The rulebook is generated from structured RuleSet records in Prisma. Every version stays visible, and pending next-season changes are already auditable."
      />

      {activeRuleSet ? (
        <section className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-ink">{activeRuleSet.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">{activeRuleSet.summary}</p>
            </div>
            <Badge tone="success">Active v{activeRuleSet.version}</Badge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Cap growth</p>
              <p className="mt-3 font-display text-3xl text-ink">
                {(activeRuleSet.rules.capGrowthRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Revenue sharing</p>
              <p className="mt-3 font-display text-3xl text-ink">
                {(activeRuleSet.rules.revenueSharingRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Second apron</p>
              <p className="mt-3 font-display text-3xl text-ink">
                {(activeRuleSet.rules.secondApronThreshold * 100).toFixed(0)}%
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Tax brackets</p>
              <p className="mt-3 text-sm leading-6 text-ink/72">
                {activeRuleSet.rules.luxuryTaxBrackets
                  .map((bracket) => `${bracket.label}: ${bracket.rate.toFixed(2)}x`)
                  .join(" · ")}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        {ruleSets.map((ruleSet) => (
          <article key={ruleSet.id} className="panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl text-ink">
                  {ruleSet.title} · v{ruleSet.version}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink/70">{ruleSet.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ruleSet.isActive ? <Badge tone="success">Active</Badge> : null}
                {!ruleSet.isActive && ruleSet.effectiveSeasonYear ? (
                  <Badge tone="warn">Pending for {ruleSet.effectiveSeasonYear}</Badge>
                ) : null}
              </div>
            </div>

            {ruleSet.changeSummary.length > 0 ? (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {ruleSet.changeSummary.map((change) => (
                  <div key={`${ruleSet.id}-${change.label}`} className="rounded-2xl border border-line bg-white/60 p-4">
                    <p className="font-medium text-ink">{change.label}</p>
                    <p className="mt-2 text-sm text-ink/62">{change.previous} → {change.next}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-ink/60">
                This is the founding ruleset, so no prior diff exists.
              </p>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
