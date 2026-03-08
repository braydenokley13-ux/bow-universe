"use client";

import { useEffect, useRef, useState } from "react";

type GlossaryTerm = {
  id: string;
  slug: string;
  term: string;
  definition: string;
  bowExample: string | null;
  category: string | null;
};

export function GlossaryPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-load terms on first open
  useEffect(() => {
    if (!isOpen || loaded) return;
    fetch("/api/glossary")
      .then((r) => r.json())
      .then((data: GlossaryTerm[]) => { setTerms(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [isOpen, loaded]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const filtered = query.trim()
    ? terms.filter(
        (t) =>
          t.term.toLowerCase().includes(query.toLowerCase()) ||
          t.definition.toLowerCase().includes(query.toLowerCase())
      )
    : terms;

  // Group by category
  const groups = new Map<string, GlossaryTerm[]>();
  for (const term of filtered) {
    const key = term.category ?? "General";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(term);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-line bg-white/90 px-4 py-2.5 text-sm font-medium text-ink shadow-md backdrop-blur-sm transition hover:border-accent hover:text-accent print:hidden"
        aria-label="Toggle glossary"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.22em]">Glossary</span>
      </button>

      {/* Panel */}
      {isOpen && (
        <>
          {/* Backdrop (mobile) */}
          <div
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          <aside className="fixed bottom-0 right-0 z-50 flex h-[85vh] w-full flex-col border-l border-t border-line bg-panel/95 shadow-2xl backdrop-blur-md lg:bottom-16 lg:h-[70vh] lg:max-h-[680px] lg:w-96 lg:rounded-2xl lg:border print:hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-accent">
                  League Glossary
                </p>
                <p className="mt-0.5 text-sm font-medium text-ink">Economic terms explained</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-line bg-white/70 px-3 py-1.5 text-xs text-ink/60 hover:border-accent"
              >
                Close
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-line px-4 py-3">
              <input
                ref={inputRef}
                type="search"
                placeholder="Search terms…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setExpanded(null); }}
                className="w-full rounded-xl border border-line bg-white/80 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>

            {/* Term list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {!loaded && (
                <p className="text-sm text-ink/50">Loading terms…</p>
              )}
              {loaded && filtered.length === 0 && (
                <p className="text-sm text-ink/50">No terms match "{query}".</p>
              )}
              {loaded && filtered.length > 0 && sortedGroups.map(([group, groupTerms]) => (
                <div key={group}>
                  {sortedGroups.length > 1 && (
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-accent">
                      {group}
                    </p>
                  )}
                  <div className="space-y-1.5">
                    {groupTerms.map((term) => (
                      <div key={term.id} className="rounded-2xl border border-line bg-white/60">
                        <button
                          onClick={() => setExpanded(expanded === term.id ? null : term.id)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <span className="text-sm font-medium text-ink">{term.term}</span>
                          <span className="ml-2 text-xs text-ink/40">{expanded === term.id ? "▲" : "▼"}</span>
                        </button>
                        {expanded === term.id && (
                          <div className="border-t border-line px-4 pb-4 pt-3 space-y-2">
                            <p className="text-sm leading-6 text-ink/75">{term.definition}</p>
                            {term.bowExample && (
                              <div className="rounded-xl border border-accent/20 bg-accent/5 px-3 py-2">
                                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
                                  In the BOW League
                                </p>
                                <p className="mt-1 text-xs leading-5 text-ink/68">{term.bowExample}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer link */}
            <div className="border-t border-line px-5 py-3">
              <a
                href="/glossary"
                className="text-xs text-accent hover:underline"
              >
                View full glossary →
              </a>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
