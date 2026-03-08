import { OpenSandboxExplorer } from "@/components/open-sandbox-explorer";
import { SandboxScenarioCard } from "@/components/sandbox-scenario-card";
import { SectionHeading } from "@/components/section-heading";
import { parseRules } from "@/lib/rules";
import type { LeagueRulesV1, SandboxImpactReport } from "@/lib/types";
import { getViewer } from "@/server/auth";
import { getPublicSandboxScenarios, getSandboxPageData, getUserSandboxScenarios } from "@/server/data";

export default async function SandboxPage() {
  const viewer = await getViewer();
  const { ruleSets } = await getSandboxPageData();
  const [myScenarios, publicScenarios] = viewer
    ? await Promise.all([
        getUserSandboxScenarios(viewer.id),
        getPublicSandboxScenarios()
      ])
    : [[], []];

  const ruleSetOptions = ruleSets.map((rs) => ({
    id: rs.id,
    version: rs.version,
    rules: parseRules(rs.rulesJson as LeagueRulesV1)
  }));

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="What-If Sandbox"
        title="Explore rule changes freely"
        description="Adjust cap growth, revenue sharing, or tax thresholds and run a simulation against all 12 teams — before committing to any proposal. Save scenarios as evidence for your research."
      />

      {ruleSetOptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="font-display text-xl text-ink">No active ruleset found</p>
          <p className="mt-3 text-sm leading-6 text-ink/68">
            An admin needs to set up an active ruleset before the sandbox can run.
          </p>
        </div>
      ) : (
        <OpenSandboxExplorer ruleSets={ruleSetOptions} />
      )}

      {viewer && myScenarios.length > 0 && (
        <section className="space-y-5">
          <div>
            <h3 className="font-display text-2xl text-ink">Your saved scenarios</h3>
            <p className="mt-2 text-sm leading-6 text-ink/68">
              These scenarios preserve your exploration history. Reference them in your research
              or proposals.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {myScenarios.map((scenario) => (
              <SandboxScenarioCard
                key={scenario.id}
                id={scenario.id}
                name={scenario.name}
                description={scenario.description}
                ruleSetVersion={scenario.ruleSet.version}
                result={scenario.resultJson as SandboxImpactReport | null}
                isPublic={scenario.isPublic}
                createdAt={scenario.createdAt}
                isOwner={true}
              />
            ))}
          </div>
        </section>
      )}

      {publicScenarios.length > 0 && (
        <section className="space-y-5">
          <div>
            <h3 className="font-display text-2xl text-ink">Shared by classmates</h3>
            <p className="mt-2 text-sm leading-6 text-ink/68">
              These scenarios were shared by other students. Use them to see what others have been
              testing.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {publicScenarios.map((scenario) => (
              <SandboxScenarioCard
                key={scenario.id}
                id={scenario.id}
                name={scenario.name}
                description={scenario.description}
                ruleSetVersion={scenario.ruleSet.version}
                result={scenario.resultJson as SandboxImpactReport | null}
                createdByName={scenario.createdBy.name}
                isPublic={scenario.isPublic}
                createdAt={scenario.createdAt}
                isOwner={false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
