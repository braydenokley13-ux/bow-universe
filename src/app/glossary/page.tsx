import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { getAllGlossaryTerms } from "@/server/data";
import { requireAdmin } from "@/server/auth";
import { getViewer } from "@/server/auth";

export default async function GlossaryPage() {
  const [terms, viewer] = await Promise.all([getAllGlossaryTerms(), getViewer()]);

  // Group alphabetically
  const groups = new Map<string, typeof terms>();
  for (const term of terms) {
    const letter = term.term[0].toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(term);
  }
  const sortedLetters = [...groups.keys()].sort();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Glossary"
          title="Economic terms for the BOW League"
          description="All the words you'll encounter while researching. Every definition is written to make sense for someone learning economics for the first time."
        />
        {viewer?.role === "ADMIN" && (
          <Link
            href="/admin"
            className="shrink-0 rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink hover:border-accent"
          >
            Manage terms →
          </Link>
        )}
      </div>

      {terms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="font-display text-xl text-ink">No glossary terms yet</p>
          <p className="mt-3 text-sm leading-6 text-ink/68">
            An admin can add terms from the admin panel.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedLetters.map((letter) => (
            <section key={letter}>
              <h3 className="mb-4 font-display text-3xl text-accent">{letter}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {groups.get(letter)!.map((term) => (
                  <article key={term.id} className="rounded-2xl border border-line bg-white/60 p-5 space-y-2">
                    <p className="font-display text-lg text-ink">{term.term}</p>
                    {term.category && (
                      <span className="inline-flex rounded-full border border-line bg-white/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/55">
                        {term.category}
                      </span>
                    )}
                    <p className="text-sm leading-6 text-ink/70">{term.definition}</p>
                    {term.bowExample && (
                      <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
                          In the BOW League
                        </p>
                        <p className="mt-1 text-sm leading-5 text-ink/68">{term.bowExample}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
