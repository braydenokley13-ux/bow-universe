export type GlossaryListTerm = {
  term: string;
  definition: string;
  category: string | null;
};

function normalizedQuery(query: string) {
  return query.trim().toLowerCase();
}

export function filterGlossaryTerms<T extends Pick<GlossaryListTerm, "term" | "definition">>(
  terms: T[],
  query: string
) {
  const normalized = normalizedQuery(query);

  if (!normalized) {
    return terms;
  }

  return terms.filter(
    (term) =>
      term.term.toLowerCase().includes(normalized) ||
      term.definition.toLowerCase().includes(normalized)
  );
}

export function groupGlossaryTermsByCategory<T extends Pick<GlossaryListTerm, "category">>(
  terms: T[]
) {
  const groups = new Map<string, T[]>();

  for (const term of terms) {
    const key = term.category ?? "General";
    const existing = groups.get(key) ?? [];
    existing.push(term);
    groups.set(key, existing);
  }

  return [...groups.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}

export function groupGlossaryTermsByLetter<T extends Pick<GlossaryListTerm, "term">>(terms: T[]) {
  const groups = new Map<string, T[]>();

  for (const term of terms) {
    const key = term.term[0]?.toUpperCase() ?? "#";
    const existing = groups.get(key) ?? [];
    existing.push(term);
    groups.set(key, existing);
  }

  return [...groups.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}
