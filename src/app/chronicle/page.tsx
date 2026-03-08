import { ChronicleArticleCard } from "@/components/chronicle-article-card";
import { SectionHeading } from "@/components/section-heading";
import { getChronicleData } from "@/server/data";

type CategoryFilter = "all" | "season_advance" | "proposal_approved" | "issue_triggered";

export default async function ChroniclePage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const filter = (category as CategoryFilter) || "all";

  const articles = await getChronicleData(60);

  const filtered =
    filter === "all" ? articles : articles.filter((a) => a.category === filter);

  // Group by season year
  const bySeasonYear = new Map<number | null, typeof filtered>();
  for (const article of filtered) {
    const year = article.season?.year ?? null;
    if (!bySeasonYear.has(year)) bySeasonYear.set(year, []);
    bySeasonYear.get(year)!.push(article);
  }

  const sortedYears = [...bySeasonYear.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return b - a;
  });

  const filters: { label: string; value: CategoryFilter }[] = [
    { label: "All", value: "all" },
    { label: "Season reports", value: "season_advance" },
    { label: "Rule changes", value: "proposal_approved" },
    { label: "League alerts", value: "issue_triggered" }
  ];

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="League Chronicle"
        title="The BOW League in plain language"
        description="Auto-generated news from the simulation engine. Every season advance, approved proposal, and triggered alert produces a brief that puts the numbers into words — a starting point for deeper research."
      />

      {/* Filter tabs */}
      <nav className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <a
            key={f.value}
            href={f.value === "all" ? "/chronicle" : `/chronicle?category=${f.value}`}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              filter === f.value
                ? "border-accent bg-accent text-white"
                : "border-line bg-white/70 text-ink hover:border-accent"
            }`}
          >
            {f.label}
          </a>
        ))}
      </nav>

      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="font-display text-xl text-ink">No chronicle articles yet</p>
          <p className="mt-3 text-sm leading-6 text-ink/68">
            Articles are generated automatically when the commissioner advances a season or approves a proposal. Check back after the next season advance.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink/55">No articles match this filter.</p>
      ) : (
        <div className="space-y-10">
          {sortedYears.map((year) => (
            <section key={year ?? "no-season"} className="space-y-4">
              <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-accent">
                {year ? `Season ${year}` : "League-wide"}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {bySeasonYear.get(year)!.map((article) => (
                  <ChronicleArticleCard
                    key={article.id}
                    id={article.id}
                    headline={article.headline}
                    body={article.body}
                    category={article.category}
                    seasonYear={article.season?.year}
                    teamName={article.team?.name}
                    teamId={article.teamId}
                    entityType={article.entityType}
                    entityId={article.entityId}
                    publishedAt={article.publishedAt}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
