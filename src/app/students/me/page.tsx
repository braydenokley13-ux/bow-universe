import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { getViewer } from "@/server/auth";
import { getStudentPortfolioData } from "@/server/showcase-data";

export default async function StudentPortfolioPage() {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/login");
  }

  const portfolio = await getStudentPortfolioData(viewer.id);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Student portfolio"
        title={portfolio.user?.name ?? "Student portfolio"}
        description="Your long-view archive of growth: what you published, what feedback you answered, and how your work has improved over time."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Published</p>
          <p className="mt-3 font-display text-3xl text-ink">{portfolio.stats.publishedCount}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Open work</p>
          <p className="mt-3 font-display text-3xl text-ink">{portfolio.stats.openCount}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Feedback answered</p>
          <p className="mt-3 font-display text-3xl text-ink">{portfolio.stats.feedbackCount}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Revisions</p>
          <p className="mt-3 font-display text-3xl text-ink">{portfolio.stats.revisionCount}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Published archive</h3>
            <Link href="/research" className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink">
              Open research archive
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {portfolio.publications.map((publication) => (
              <Link
                key={publication.id}
                href={`/research/${publication.slug}`}
                className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-ink">{publication.title}</p>
                  <Badge>{publication.publicationType.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/68">{publication.abstract}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Challenge history</h3>
            <Link href="/challenges" className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink">
              Browse challenges
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {portfolio.challengeEntries.map((entry) => (
              <Link
                key={entry.id}
                href={`/challenges/${entry.challenge.id}`}
                className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-ink">{entry.challenge.title}</p>
                  <Badge tone="success">{entry.totalScore} pts</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/68">{entry.challenge.summary}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Growth timeline</h3>
          <div className="mt-6 space-y-3">
            {portfolio.growthTimeline.map((item) => (
              <div key={item.id} className="rounded-2xl border border-line bg-white/60 p-4">
                <p className="font-medium text-ink">{item.label}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink/55">
                  {new Date(item.createdAt).toLocaleString("en-US")}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Spotlights and notes</h3>
          <div className="mt-6 space-y-4">
            {portfolio.spotlightPosts.length > 0 ? (
              portfolio.spotlightPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/news#${post.slug}`}
                  className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                >
                  <p className="font-medium text-ink">{post.headline}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{post.dek}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink/55">
                    {post.author.name} · {new Date(post.publishedAt).toLocaleDateString("en-US")}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                No commissioner spotlight has been linked to your work yet.
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
