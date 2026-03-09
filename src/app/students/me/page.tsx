import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { gradeBandDescriptions, gradeBandLabels } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { updateStudentGradeBandAction } from "@/server/actions";
import { getViewer } from "@/server/auth";
import { getStudentPortfolioData } from "@/server/showcase-data";

export default async function StudentPortfolioPage({
  searchParams
}: {
  searchParams?: Promise<{ firstProject?: string }>;
}) {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const [portfolio, profile] = await Promise.all([
    getStudentPortfolioData(viewer.id),
    prisma.user.findUnique({
      where: { id: viewer.id },
      select: {
        gradeBand: true,
        onboardingCompletedAt: true
      }
    })
  ]);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Student portfolio"
        title={portfolio.user?.name ?? "Student portfolio"}
        description="Your long-view archive of growth: what you published, what feedback you answered, and how your work has improved over time."
      />

      {resolvedSearchParams.firstProject === "1" ? (
        <section className="panel p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">First project complete</p>
          <h3 className="mt-3 font-display text-2xl text-ink">You finished your first guided project</h3>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            That gives you a real starting point. Next, wait for feedback or start a second project when your teacher is ready.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Go back home
            </Link>
            <Link
              href="/projects"
              className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
            >
              See your project list
            </Link>
          </div>
        </section>
      ) : null}

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

      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Learning track</p>
            <h3 className="mt-3 font-display text-2xl text-ink">Choose the section that fits your class</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">
              This changes how much help you see at once. You can switch later if your teacher wants you to move into the fuller workflow.
            </p>
          </div>
          <Badge tone={profile?.gradeBand ? "success" : "warn"}>
            {profile?.gradeBand ? gradeBandLabels[profile.gradeBand] : "Choose now"}
          </Badge>
        </div>

        <form action={updateStudentGradeBandAction} className="mt-6 grid gap-4 md:grid-cols-2">
          {Object.entries(gradeBandLabels).map(([value, label]) => (
            <label key={value} className="rounded-2xl border border-line bg-white/60 p-4">
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="gradeBand"
                  value={value}
                  defaultChecked={profile?.gradeBand === value}
                  className="mt-1 h-4 w-4 border-line text-accent focus:ring-accent"
                />
                <div>
                  <p className="font-medium text-ink">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    {gradeBandDescriptions[value as keyof typeof gradeBandDescriptions]}
                  </p>
                </div>
              </div>
            </label>
          ))}

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink/60">
              {profile?.onboardingCompletedAt
                ? "Your new track will show up the next time the main pages reload."
                : "Pick the track you want before you start your first mission."}
            </p>
            <button
              type="submit"
              className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Save track
            </button>
          </div>
        </form>
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
