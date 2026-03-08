import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { getNewsPageData } from "@/server/showcase-data";

export default async function NewsPage() {
  const feed = await getNewsPageData();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="League newsroom"
        title="What the BOW Universe is talking about now"
        description="This feed mixes commissioner-written headlines with automatic league events so students can feel the world moving around their work."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {feed.map((item) => (
          <article
            key={`${item.kind}-${item.id}`}
            id={item.slug ?? undefined}
            className="panel p-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={item.kind === "editorial" ? "success" : "default"}>
                {item.kind === "editorial" ? "Commissioner desk" : "League feed"}
              </Badge>
              {item.pinned ? <Badge tone="success">Pinned</Badge> : null}
            </div>

            <h3 className="mt-4 font-display text-3xl text-ink">{item.headline}</h3>
            <p className="mt-3 text-sm leading-6 text-ink/68">{item.dek}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-ink/55">
              {new Date(item.publishedAt).toLocaleString("en-US")}
              {item.authorName ? ` · ${item.authorName}` : ""}
            </p>
            <Link
              href={item.href}
              className="mt-5 inline-flex rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
            >
              Follow this story
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
