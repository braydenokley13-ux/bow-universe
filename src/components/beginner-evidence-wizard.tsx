"use client";

import Link from "next/link";

import {
  appendEvidenceNote,
  appendReferenceLine,
  buildIssueMetricEvidenceCards,
  buildIssueReferenceLine,
  countNonEmptyLines,
  getIssueTriggerReason,
  parseIssueEvidenceNotes
} from "@/lib/evidence-wizard";
import { getProjectCoachDomId } from "@/lib/project-wizard";

type SelectedIssue = {
  id: string;
  slug?: string | null;
  title: string;
  description: string;
  evidenceMd: string | null;
  metricsJson: unknown;
};

type BeginnerEvidenceWizardProps = {
  selectedIssue: SelectedIssue | null;
  evidence: string;
  references: string;
  onChangeEvidence: (value: string) => void;
  onChangeReferences: (value: string) => void;
};

export function BeginnerEvidenceWizard({
  selectedIssue,
  evidence,
  references,
  onChangeEvidence,
  onChangeReferences
}: BeginnerEvidenceWizardProps) {
  if (!selectedIssue) {
    return (
      <article className="panel p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 5</p>
        <h3 className="mt-3 font-display text-3xl text-ink">Collect your evidence</h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
          Pick an issue first. Then this step will show ready-made evidence notes, important metrics, and a starter source.
        </p>
      </article>
    );
  }

  const issueHref = `/issues/${selectedIssue.slug?.trim() || selectedIssue.id}`;
  const issueEvidenceNotes = parseIssueEvidenceNotes(selectedIssue.evidenceMd);
  const metricCards = buildIssueMetricEvidenceCards(selectedIssue.metricsJson);
  const triggerReason = getIssueTriggerReason(selectedIssue.metricsJson);
  const evidenceLineCount = countNonEmptyLines(evidence);
  const referenceLineCount = countNonEmptyLines(references);
  const starterReferenceLine = buildIssueReferenceLine(selectedIssue);

  function addEvidenceLine(line: string) {
    onChangeEvidence(appendEvidenceNote(evidence, line));
  }

  function addIssueSource() {
    onChangeReferences(appendReferenceLine(references, starterReferenceLine));
  }

  return (
    <article className="panel p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 5</p>
      <h3 className="mt-3 font-display text-3xl text-ink">Collect your evidence</h3>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
        Work in three tiny moves: grab a clue from the issue file, save it into your notes, then add a source line so another reader can check it.
      </p>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-[24px] border border-line bg-white/75 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">1. Start with the issue file</p>
              <h4 className="mt-2 font-display text-2xl text-ink">{selectedIssue.title}</h4>
              <p className="mt-2 text-sm leading-6 text-ink/68">{selectedIssue.description}</p>
            </div>
            <Link
              href={issueHref}
              className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-ink"
            >
              Open issue file
            </Link>
          </div>

          {issueEvidenceNotes.length > 0 ? (
            <div className="mt-5 space-y-3">
              {issueEvidenceNotes.map((note) => (
                <div key={note} className="rounded-[22px] border border-line bg-panel/70 p-4">
                  <p className="text-sm leading-6 text-ink/72">{note}</p>
                  <button
                    type="button"
                    onClick={() => addEvidenceLine(note)}
                    className="mt-3 rounded-full border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Add this evidence
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[22px] border border-dashed border-line bg-panel/55 p-4 text-sm leading-6 text-ink/65">
              This issue does not have saved evidence notes yet. Open the issue file, news, or rules page and bring back the clearest fact you find.
            </div>
          )}

          {(metricCards.length > 0 || triggerReason) ? (
            <div className="mt-5 space-y-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Useful numbers</p>
              {metricCards.map((card) => (
                <div key={card.key} className="rounded-[22px] border border-line bg-panel/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{card.label}</p>
                      <p className="mt-1 font-display text-2xl text-ink">{card.valueLabel}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addEvidenceLine(card.evidenceLine)}
                      className="rounded-full border border-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink"
                    >
                      Use metric
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/68">{card.detail}</p>
                </div>
              ))}

              {triggerReason ? (
                <div className="rounded-[22px] border border-line bg-panel/70 p-4">
                  <p className="text-sm font-semibold text-ink">Why this issue got flagged</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{triggerReason}</p>
                  <button
                    type="button"
                    onClick={() => addEvidenceLine(triggerReason)}
                    className="mt-3 rounded-full border border-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    Add trigger reason
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="rounded-[24px] border border-line bg-white/75 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">2. Build your notes</p>
                <h4 className="mt-2 font-display text-2xl text-ink">Evidence notes</h4>
              </div>
              <p className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-ink/68">
                {evidenceLineCount} line{evidenceLineCount === 1 ? "" : "s"} saved
              </p>
            </div>

            <p className="mt-3 text-sm leading-6 text-ink/68">
              Aim for at least two concrete clues. Good evidence usually sounds like a fact, comparison, number, observation, or saved example.
            </p>

            <textarea
              id={getProjectCoachDomId("evidence")}
              value={evidence}
              onChange={(event) => onChangeEvidence(event.target.value)}
              placeholder="- One piece of evidence that helps is...\n- Another clue is..."
              className="mt-5 min-h-[220px] w-full rounded-[24px] border border-line bg-white/90 px-4 py-4 text-base text-ink outline-none transition focus:border-accent"
            />
          </div>

          <div className="rounded-[24px] border border-line bg-white/75 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">3. Make it checkable</p>
                <h4 className="mt-2 font-display text-2xl text-ink">Starter source</h4>
              </div>
              <p className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-ink/68">
                {referenceLineCount} source line{referenceLineCount === 1 ? "" : "s"}
              </p>
            </div>

            <p className="mt-3 text-sm leading-6 text-ink/68">
              Step 9 is still where you finish the source list. This button just gives the student one correct starting line right now.
            </p>

            <div className="mt-4 rounded-[22px] border border-line bg-panel/65 p-4">
              <p className="font-mono text-xs text-accent">Source line preview</p>
              <p className="mt-2 break-all text-sm leading-6 text-ink/72">{starterReferenceLine}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addIssueSource}
                className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                Add issue source
              </button>
              <Link
                href="/news"
                className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-ink"
              >
                Open news
              </Link>
              <Link
                href="/rules"
                className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-ink"
              >
                Open rules
              </Link>
            </div>

            {references.trim() ? (
              <div className="mt-4 rounded-[22px] border border-line bg-white/80 p-4">
                <p className="font-mono text-xs text-accent">Current sources</p>
                <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink/72">{references}</pre>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </article>
  );
}
