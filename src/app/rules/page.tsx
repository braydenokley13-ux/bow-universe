import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { getRuleSetsData } from "@/server/data";

function explainChange(label: string, next: string) {
  const text = label.toLowerCase();

  if (text.includes("revenue")) {
    return `This matters because revenue sharing changes how much breathing room lower-revenue teams can keep when league pressure rises. The new target is ${next}.`;
  }

  if (text.includes("apron")) {
    return `This matters because apron thresholds change when teams lose tools and planning freedom. The new target is ${next}.`;
  }

  if (text.includes("tax")) {
    return `This matters because tax brackets influence which spending choices feel worth the cost. The new target is ${next}.`;
  }

  return `This matters because even small rule changes can shift incentives across the league. The new target is ${next}.`;
}

export default async function RulesPage() {
  const ruleSets = await getRuleSetsData();
  const activeRuleSet = ruleSets.find((ruleSet) => ruleSet.isActive) ?? ruleSets[0];
  const previousRuleSet = activeRuleSet
    ? ruleSets.find((ruleSet) => ruleSet.version === activeRuleSet.version - 1)
    : null;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Rules"
        title="Versioned rulebook"
        description="The rulebook now explains the active environment first, then shows how it changed from the last version so a new reader can understand why the numbers matter."
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
              <p className="mt-2 text-sm leading-6 text-ink/65">
                This controls how fast the spending baseline can grow from season to season.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Revenue sharing</p>
              <p className="mt-3 font-display text-3xl text-ink">
                {(activeRuleSet.rules.revenueSharingRate * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                This rate changes how much league support flows back to lower-revenue teams.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Second apron</p>
              <p className="mt-3 font-display text-3xl text-ink">
                {(activeRuleSet.rules.secondApronThreshold * 100).toFixed(0)}%
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                This threshold helps determine when teams start losing key spending tools.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Tax brackets</p>
              <p className="mt-3 text-sm leading-6 text-ink/72">
                {activeRuleSet.rules.luxuryTaxBrackets
                  .map((bracket) => `${bracket.label}: ${bracket.rate.toFixed(2)}x`)
                  .join(" · ")}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                These rates shape how painful extra spending becomes at each tax tier.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-line bg-white/60 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">What changed from the last ruleset</p>
              {activeRuleSet.changeSummary.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {activeRuleSet.changeSummary.map((change) => (
                    <div key={change.label} className="rounded-2xl border border-line bg-white/80 p-4">
                      <p className="font-medium text-ink">{change.label}</p>
                      <p className="mt-2 text-sm text-ink/65">{change.previous} → {change.next}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-ink/65">
                  This is the founding ruleset, so there is no earlier version to compare against.
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-line bg-white/60 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Why this matters</p>
              {activeRuleSet.changeSummary.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {activeRuleSet.changeSummary.map((change) => (
                    <div key={`${change.label}-why`} className="rounded-2xl border border-line bg-white/80 p-4">
                      <p className="font-medium text-ink">{change.label}</p>
                      <p className="mt-2 text-sm leading-6 text-ink/68">{explainChange(change.label, change.next)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-ink/65">
                  Future versions will explain why the new settings matter to team behavior and league balance.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {previousRuleSet ? (
        <section className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-ink">Previous baseline</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                Use the previous ruleset as a reference point when you want to understand what actually changed.
              </p>
            </div>
            <Badge>v{previousRuleSet.version}</Badge>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/68">{previousRuleSet.summary}</p>
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
