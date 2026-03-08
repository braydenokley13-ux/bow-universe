import { Badge } from "@/components/badge";
import type { createNewsPostAction } from "@/server/community-actions";

type AdminNewsroomDeskProps = {
  action: typeof createNewsPostAction;
  posts: Array<{
    id: string;
    headline: string;
    dek: string;
    slug: string;
    pinned: boolean;
    publishedAt: Date;
    author: { name: string };
  }>;
};

export function AdminNewsroomDesk({ action, posts }: AdminNewsroomDeskProps) {
  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Newsroom</p>
          <h3 className="mt-3 font-display text-2xl text-ink">Publish the league story</h3>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Mix commissioner-written headlines with the automatic league feed so students see what changed and why it matters.
          </p>
        </div>
        <Badge>{posts.length} recent</Badge>
      </div>

      <form action={action} className="mt-6 grid gap-4 rounded-2xl border border-line bg-white/55 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="news-headline" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Headline
            </label>
            <input
              id="news-headline"
              name="headline"
              type="text"
              placeholder="Commissioner opens a new challenge around second-apron pressure"
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="news-dek" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Dek
            </label>
            <input
              id="news-dek"
              name="dek"
              type="text"
              placeholder="What students should watch, investigate, or submit next."
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="news-body" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Story body
          </label>
          <textarea
            id="news-body"
            name="bodyMd"
            rows={5}
            placeholder="Write the full commissioner update in markdown."
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6 text-ink outline-none focus:border-accent"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr_auto]">
          <div>
            <label htmlFor="news-linked-type" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Linked entity type
            </label>
            <input
              id="news-linked-type"
              name="linkedEntityType"
              type="text"
              placeholder="Issue"
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="news-linked-id" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Linked entity id
            </label>
            <input
              id="news-linked-id"
              name="linkedEntityId"
              type="text"
              placeholder="Optional source id to point readers to"
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" name="pinned" className="h-4 w-4 rounded border-line" />
              Pin
            </label>
            <button
              type="submit"
              className="rounded-full border border-accent bg-accent px-4 py-3 text-sm font-medium text-white"
            >
              Publish post
            </button>
          </div>
        </div>
      </form>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {posts.map((post) => (
          <article key={post.id} className="rounded-2xl border border-line bg-white/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-ink">{post.headline}</p>
              <div className="flex gap-2">
                {post.pinned ? <Badge tone="success">Pinned</Badge> : null}
                <Badge>{new Date(post.publishedAt).toLocaleDateString("en-US")}</Badge>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink/68">{post.dek}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink/55">
              {post.author.name} · {post.slug}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
