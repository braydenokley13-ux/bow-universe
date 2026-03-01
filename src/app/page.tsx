import { MetricCard } from "@/components/metric-card";
import { SectionHeading } from "@/components/section-heading";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="League Dashboard"
        title="A calm operating view for the BOW League"
        description="The dashboard will become the central research terminal for rules, league health, and recent institutional activity. In this first stage, the shell and visual direction are in place."
      />

      <section className="metric-grid">
        <MetricCard
          label="Ruleset"
          value="Pending"
          detail="The active ruleset card will connect to versioned league rules once the database stage is live."
        />
        <MetricCard
          label="Season"
          value="Seed"
          detail="Season progress and the commissioner advance controls will land after the simulation engine and admin actions are connected."
        />
        <MetricCard
          label="Issues"
          value="Board"
          detail="League-wide issue monitoring will become a live feed once seeded data and issue workflows exist."
        />
        <MetricCard
          label="Archive"
          value="Feed"
          detail="The history feed will turn on after activity events, proposals, and decisions are stored in the database."
        />
      </section>

      <section className="panel p-6">
        <h3 className="font-display text-2xl text-ink">Stage 1 foundation</h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
          The app shell, navigation, design tokens, environment scaffolding, and route map
          are now the first things being built. Each later diff will replace these placeholders
          with real league data and workflow tools.
        </p>
      </section>
    </div>
  );
}
