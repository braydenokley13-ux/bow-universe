import { describe, expect, it } from "vitest";

import {
  filterGlossaryTerms,
  groupGlossaryTermsByCategory,
  groupGlossaryTermsByLetter
} from "@/lib/glossary";

const terms = [
  {
    term: "Salary Cap",
    definition: "The spending limit for team payrolls.",
    category: "Rules"
  },
  {
    term: "Revenue Sharing",
    definition: "Money is pooled and shared across the league.",
    category: "Economics"
  },
  {
    term: "Parity",
    definition: "A measure of how even the teams are.",
    category: null
  }
];

describe("glossary helpers", () => {
  it("filters by term name and definition text", () => {
    expect(filterGlossaryTerms(terms, "salary")).toEqual([terms[0]]);
    expect(filterGlossaryTerms(terms, "pooled")).toEqual([terms[1]]);
    expect(filterGlossaryTerms(terms, "")).toEqual(terms);
  });

  it("groups categories alphabetically and uses General for missing categories", () => {
    expect(groupGlossaryTermsByCategory(terms)).toEqual([
      ["Economics", [terms[1]]],
      ["General", [terms[2]]],
      ["Rules", [terms[0]]]
    ]);
  });

  it("groups terms by starting letter", () => {
    expect(groupGlossaryTermsByLetter(terms)).toEqual([
      ["P", [terms[2]]],
      ["R", [terms[1]]],
      ["S", [terms[0]]]
    ]);
  });
});
