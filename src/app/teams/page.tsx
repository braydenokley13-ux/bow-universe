import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { formatCompactCurrency } from "@/lib/utils";
import { getTeamsPageData } from "@/server/data";

function taxTone(value: number) {
  if (value === 0) {
    return "success" as const;
  }
  if (value >= 20) {
    return "danger" as const;
  }
  return "warn" as const;
}

function taxLabel(value: number) {
  if (value === 0) {
    return "Below tax";
  }
  if (value >= 20) {
    return "Second apron pressure";
  }
  return "Taxpayer";
}

export default async function TeamsPage() {
  const { currentSeason, teams } = await getTeamsPageData();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Teams"
        title="League franchise index"
        description={`The ${teams.length}-team universe is now loaded from Prisma for season ${currentSeason?.year ?? "-"}. Each entry links into a team dossier with contracts, finances, and strategy history.`}
      />

      <section className="table-shell">
        <div className="grid grid-cols-[1.8fr_0.9fr_1fr_1fr_1fr] gap-3 border-b border-line bg-mist/60 px-5 py-4 font-mono text-xs uppercase tracking-[0.2em] text-ink/55">
          <p>Team</p>
          <p>Market</p>
          <p>Payroll</p>
          <p>Tax paid</p>
          <p>Status</p>
        </div>

        <div className="divide-y divide-line/80">
          {teams.map((teamSeason) => (
            <Link
              key={teamSeason.id}
              href={`/teams/${teamSeason.team.id}`}
              className="grid grid-cols-[1.8fr_0.9fr_1fr_1fr_1fr] gap-3 px-5 py-5 hover:bg-white/55"
            >
              <div>
                <p className="font-medium text-ink">{teamSeason.team.name}</p>
                <p className="mt-1 text-sm text-ink/62">Performance proxy {teamSeason.performanceProxy}</p>
              </div>
              <p className="text-sm text-ink/75">{teamSeason.team.marketSizeTier}</p>
              <p className="text-sm text-ink/75">{formatCompactCurrency(teamSeason.payroll)}</p>
              <p className="text-sm text-ink/75">{formatCompactCurrency(teamSeason.taxPaid)}</p>
              <div>
                <Badge tone={taxTone(teamSeason.taxPaid)}>{taxLabel(teamSeason.taxPaid)}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
