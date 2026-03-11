import { describe, expect, it } from "vitest";

import {
  appendEvidenceNote,
  appendReferenceLine,
  buildIssueMetricEvidenceCards,
  buildIssueReferenceLine,
  countNonEmptyLines,
  getIssueTriggerReason,
  parseIssueEvidenceNotes
} from "@/lib/evidence-wizard";

describe("evidence wizard helpers", () => {
  it("parses markdown evidence notes into plain lines", () => {
    expect(parseIssueEvidenceNotes("- First clue\n- Second clue\n3. Third clue")).toEqual([
      "First clue",
      "Second clue",
      "Third clue"
    ]);
  });

  it("builds metric evidence cards from issue metrics", () => {
    expect(
      buildIssueMetricEvidenceCards({
        revenueInequality: 1.46,
        taxConcentration: 0.68
      })
    ).toEqual([
      expect.objectContaining({
        key: "revenueInequality",
        valueLabel: "1.46"
      }),
      expect.objectContaining({
        key: "taxConcentration",
        valueLabel: "68.0%"
      })
    ]);
  });

  it("returns the trigger reason when present", () => {
    expect(getIssueTriggerReason({ triggerReason: "The number crossed the warning line." })).toBe(
      "The number crossed the warning line."
    );
    expect(getIssueTriggerReason({})).toBe("");
  });

  it("appends evidence notes without duplicates", () => {
    const once = appendEvidenceNote("", "A useful clue");
    const twice = appendEvidenceNote(once, "A useful clue");

    expect(once).toBe("- A useful clue");
    expect(twice).toBe("- A useful clue");
  });

  it("appends references without duplicates", () => {
    const line = buildIssueReferenceLine({
      id: "market-inequality",
      slug: "market-inequality",
      title: "Market inequality"
    });

    const once = appendReferenceLine("", line);
    const twice = appendReferenceLine(once, line);

    expect(once).toBe(line);
    expect(twice).toBe(line);
  });

  it("counts non-empty lines", () => {
    expect(countNonEmptyLines("one\n\ntwo\n")).toBe(2);
  });
});
