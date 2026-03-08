import Link from "next/link";

import { Breadcrumb } from "@/components/breadcrumb";
import { FinancialLineChart, defaultColor } from "@/components/financial-line-chart";
import { ParityScatterPlot } from "@/components/parity-scatter-plot";
import { SectionHeading } from "@/components/section-heading";
import { calculateLeagueMetrics } from "@/lib/sim";
import { getLeagueHistoryData } from "@/server/data";

export default async function LeagueHistoryPage() {
  const seasons = await getLeagueHistoryData();

  // Build per-team payroll series across all seasons
  const teamMap = new Map<string, { name: string; points: { year: number; value: number }[] }>();
  for (const season of seasons) {
    for (const ts of season.teamSeasons) {
      if (!teamMap.has(ts.teamId)) {
        teamMap.set(ts.teamId, { name: ts.team.name, points: [] });
      }
      teamMap.get(ts.teamId)!.points.push({ year: season.year, value: ts.payroll });
    }
  }

  const payrollSeries = Array.from(teamMap.entries()).map(([, data], i) => ({
    name: data.name,
    color: defaultColor(i),
    points: data.points
  }));

  // Build parity scatter from per-season metrics
  const parityPoints = seasons.map((season) => {
    const metrics = calculateLeagueMetrics(
      season.teamSeasons.map((ts) => ({
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
    );
    return { year: season.year, value: metrics.parityIndex };
  });

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Teams", href: "/teams" },
          { label: "League History" }
        ]}
      />

      <SectionHeading
        eyebrow="League History"
        title="Multi-season financial trends"
        description="Compare how payroll, tax, and competitive balance have shifted as seasons advanced and rules changed. Use these charts in your research or strategy work."
      />

      <section className="panel p-6">
        <div className="mb-5">
          <h3 className="font-display text-2xl text-ink">All-team payroll trends</h3>
          <p className="mt-2 text-sm leading-6 text-ink/68">
            Each line traces a team&apos;s payroll from season to season. Steep upward lines suggest aggressive roster investment; flat or declining lines may indicate rebuilding.
          </p>
        </div>
        {payrollSeries.length > 0 ? (
          <FinancialLineChart series={payrollSeries} yLabel="Payroll ($M)" height={280} />
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-ink/55">
            No season data yet. Ask your commissioner to advance the first season.
          </p>
        )}
      </section>

      <section className="panel p-6">
        <div className="mb-5">
          <h3 className="font-display text-2xl text-ink">Parity index over time</h3>
          <p className="mt-2 text-sm leading-6 text-ink/68">
            A lower parity index means teams are clustering closer together in competitiveness. Watch for drops after major rule changes — that&apos;s your evidence.
          </p>
        </div>
        <ParityScatterPlot points={parityPoints} yLabel="Parity Index" height={200} />
      </section>

      <div className="flex justify-start">
        <Link
          href="/teams"
          className="rounded-full border border-line bg-white/70 px-5 py-2.5 text-sm font-medium text-ink hover:border-accent"
        >
          Back to team index
        </Link>
      </div>
    </div>
  );
}
