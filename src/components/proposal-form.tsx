"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { Issue, RuleSet } from "@prisma/client";

import { publicationTypeLabels } from "@/lib/types";
import type { ProposalSubmissionContent, SandboxImpactReport } from "@/lib/types";

type ProposalFormProps = {
  issues: Array<Issue & { team?: { name: string } | null }>;
  ruleSets: RuleSet[];
  action: (formData: FormData) => void | Promise<void>;
  initial?: {
    id?: string;
    title: string;
    issueId: string;
    ruleSetId: string;
    abstract: string;
    methodsSummary: string;
    problem: string;
    currentRuleContext: string;
    proposedChange: string;
    impactAnalysis: string;
    tradeoffs: string;
    sandboxInterpretation: string;
    recommendation: string;
    diffJson: string;
    referencesText: string;
    keywordsText: string;
    keyTakeawaysText: string;
    publicationSlug: string;
    sandboxResult: SandboxImpactReport | null;
  };
  intentLabel: string;
};

type MemoDraftSnapshot = {
  title: string;
  abstract: string;
  problem: string;
  currentRuleContext: string;
  proposedChange: string;
  impactAnalysis: string;
  tradeoffs: string;
  sandboxInterpretation: string;
  recommendation: string;
  references: string;
  diffJson: string;
};

type DraftCheck = {
  completeCount: number;
  totalCount: number;
  critical: string[];
  caution: string[];
};

type AutosaveState = {
  tone: "idle" | "saving" | "saved" | "error";
  message: string;
};

type StepStatusItem = {
  label: string;
  ready: boolean;
  detail: string;
};

function fieldValue(content: ProposalSubmissionContent | null | undefined, key: keyof ProposalSubmissionContent) {
  return content?.[key] ?? "";
}

function textReady(value: string) {
  return value.trim().length >= 12;
}

function readMemoDraft(form: HTMLFormElement): MemoDraftSnapshot {
  const formData = new FormData(form);

  return {
    title: String(formData.get("title") ?? ""),
    abstract: String(formData.get("abstract") ?? ""),
    problem: String(formData.get("problem") ?? ""),
    currentRuleContext: String(formData.get("currentRuleContext") ?? ""),
    proposedChange: String(formData.get("proposedChange") ?? ""),
    impactAnalysis: String(formData.get("expectedImpact") ?? ""),
    tradeoffs: String(formData.get("tradeoffs") ?? ""),
    sandboxInterpretation: String(formData.get("sandboxInterpretation") ?? ""),
    recommendation: String(formData.get("recommendation") ?? ""),
    references: String(formData.get("references") ?? ""),
    diffJson: String(formData.get("diffJson") ?? "")
  };
}

function hasAnyDraftContent(snapshot: MemoDraftSnapshot) {
  return Object.values(snapshot).some((value) => value.trim().length > 0);
}

function buildDraftCheck(snapshot: MemoDraftSnapshot, sandboxSaved: boolean): DraftCheck {
  const critical: string[] = [];
  const caution: string[] = [];

  if (!textReady(snapshot.title)) {
    critical.push("Add a clear memo title.");
  }
  if (!textReady(snapshot.abstract)) {
    critical.push("Write the executive summary.");
  }
  if (!textReady(snapshot.problem)) {
    critical.push("Explain the league problem.");
  }
  if (!textReady(snapshot.currentRuleContext)) {
    critical.push("Explain the current rule context.");
  }
  if (!textReady(snapshot.proposedChange)) {
    critical.push("Describe the proposed rule change.");
  }
  if (!textReady(snapshot.impactAnalysis)) {
    critical.push("Add the expected impact analysis.");
  }
  if (!textReady(snapshot.recommendation)) {
    critical.push("End with a concrete recommendation.");
  }

  if (!textReady(snapshot.tradeoffs)) {
    caution.push("Tradeoffs still need more detail.");
  }
  if (!textReady(snapshot.sandboxInterpretation)) {
    caution.push("Explain what the sandbox result means.");
  }
  if (!sandboxSaved) {
    caution.push("Run the sandbox so this memo includes model evidence.");
  }
  if (!textReady(snapshot.references)) {
    caution.push("Add at least one reference or source link.");
  }
  if (!textReady(snapshot.diffJson)) {
    caution.push("The structured rule diff still looks incomplete.");
  }

  const checks = [
    textReady(snapshot.title),
    textReady(snapshot.abstract),
    textReady(snapshot.problem),
    textReady(snapshot.currentRuleContext),
    textReady(snapshot.proposedChange),
    textReady(snapshot.impactAnalysis),
    textReady(snapshot.tradeoffs),
    textReady(snapshot.sandboxInterpretation),
    textReady(snapshot.recommendation),
    sandboxSaved,
    textReady(snapshot.references),
    textReady(snapshot.diffJson)
  ];

  return {
    completeCount: checks.filter(Boolean).length,
    totalCount: checks.length,
    critical,
    caution
  };
}

function buildStepStatusItems(snapshot: MemoDraftSnapshot, sandboxSaved: boolean) {
  return {
    opening: [
      {
        label: "Title",
        ready: textReady(snapshot.title),
        detail: "A reader should understand the reform topic right away."
      },
      {
        label: "Executive summary",
        ready: textReady(snapshot.abstract),
        detail: "Explain the problem, the reform, and the likely effect in a short opening."
      }
    ] satisfies StepStatusItem[],
    memoBody: [
      {
        label: "Problem",
        ready: textReady(snapshot.problem),
        detail: "Name the league problem clearly."
      },
      {
        label: "Current rule context",
        ready: textReady(snapshot.currentRuleContext),
        detail: "Show what the league does now before suggesting change."
      },
      {
        label: "Proposed change",
        ready: textReady(snapshot.proposedChange),
        detail: "State the rule reform in plain language."
      },
      {
        label: "Impact analysis",
        ready: textReady(snapshot.impactAnalysis),
        detail: "Explain who benefits, who loses flexibility, and why."
      },
      {
        label: "Tradeoffs",
        ready: textReady(snapshot.tradeoffs),
        detail: "Show what might get harder if the reform is adopted."
      },
      {
        label: "Recommendation",
        ready: textReady(snapshot.recommendation),
        detail: "End with a clear next step for the league."
      }
    ] satisfies StepStatusItem[],
    modelReadiness: [
      {
        label: "Structured rule diff",
        ready: textReady(snapshot.diffJson),
        detail: "The memo needs a usable rule diff, not just a rough idea."
      },
      {
        label: "Sandbox evidence",
        ready: sandboxSaved,
        detail: "Run the sandbox so the memo includes model evidence."
      },
      {
        label: "Sandbox interpretation",
        ready: textReady(snapshot.sandboxInterpretation),
        detail: "Explain what the model result means for the league."
      },
      {
        label: "References",
        ready: textReady(snapshot.references),
        detail: "Add at least one source behind the memo."
      }
    ] satisfies StepStatusItem[]
  };
}

function statusTone(ready: boolean) {
  return ready
    ? "border-success/30 bg-success/10 text-success"
    : "border-warn/30 bg-warn/10 text-warn";
}

export function ProposalForm({ issues, ruleSets, action, initial, intentLabel }: ProposalFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const [draftId, setDraftId] = useState(initial?.id ?? "");
  const [draftSnapshot, setDraftSnapshot] = useState<MemoDraftSnapshot>({
    title: initial?.title ?? "",
    abstract: initial?.abstract ?? "",
    problem: initial?.problem ?? "",
    currentRuleContext: initial?.currentRuleContext ?? "",
    proposedChange: initial?.proposedChange ?? "",
    impactAnalysis: initial?.impactAnalysis ?? "",
    tradeoffs: initial?.tradeoffs ?? "",
    sandboxInterpretation: initial?.sandboxInterpretation ?? "",
    recommendation: initial?.recommendation ?? "",
    references: initial?.referencesText ?? "",
    diffJson: initial?.diffJson ?? ""
  });
  const [sandboxResult, setSandboxResult] = useState<SandboxImpactReport | null>(
    initial?.sandboxResult ?? null
  );
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({
    tone: "idle",
    message: initial?.id ? "Draft loaded." : "Autosave starts after you begin writing."
  });
  const [draftCheck, setDraftCheck] = useState<DraftCheck>({
    completeCount: 0,
    totalCount: 12,
    critical: [],
    caution: []
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!formRef.current) {
      return;
    }

    const snapshot = readMemoDraft(formRef.current);
    setDraftSnapshot(snapshot);
    setDraftCheck(buildDraftCheck(snapshot, Boolean(sandboxResult)));
  }, [sandboxResult]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  async function runAutosave() {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const snapshot = readMemoDraft(form);
    setDraftSnapshot(snapshot);
    const check = buildDraftCheck(snapshot, Boolean(sandboxResult));
    setDraftCheck(check);

    if (!hasAnyDraftContent(snapshot) && !draftId) {
      return;
    }

    const payload = new FormData(form);
    if (draftId) {
      payload.set("proposalId", draftId);
    }

    setAutosaveState({
      tone: "saving",
      message: "Saving memo draft..."
    });

    try {
      const response = await fetch("/api/studio/proposal-autosave", {
        method: "POST",
        body: payload
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Autosave failed.");
      }

      if (result.id && result.id !== draftId) {
        setDraftId(result.id);
        if (!initial?.id && result.editUrl) {
          router.replace(result.editUrl);
        }
      }

      setAutosaveState({
        tone: "saved",
        message: `Draft saved at ${new Date(result.savedAt).toLocaleTimeString()}`
      });
    } catch (error) {
      setAutosaveState({
        tone: "error",
        message: error instanceof Error ? error.message : "Autosave failed."
      });
    }
  }

  function scheduleAutosave() {
    if (!formRef.current) {
      return;
    }

    const snapshot = readMemoDraft(formRef.current);
    setDraftSnapshot(snapshot);
    setDraftCheck(buildDraftCheck(snapshot, Boolean(sandboxResult)));

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void runAutosave();
    }, 900);
  }

  const stepStatus = buildStepStatusItems(draftSnapshot, Boolean(sandboxResult));

  function runSandbox() {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const formData = new FormData(form);
    const ruleSetId = String(formData.get("ruleSetId") ?? "");
    const diffJson = String(formData.get("diffJson") ?? "");

    startTransition(async () => {
      try {
        setSandboxError(null);
        const response = await fetch("/api/sandbox", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ruleSetId,
            diff: JSON.parse(diffJson)
          })
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Sandbox run failed.");
        }

        setSandboxResult(payload);
        setDraftCheck((current) => ({
          ...current,
          caution: current.caution.filter((line) => line !== "Run the sandbox so this memo includes model evidence.")
        }));
        scheduleAutosave();
      } catch (error) {
        setSandboxResult(null);
        setSandboxError(error instanceof Error ? error.message : "Sandbox run failed.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-6"
      onInput={scheduleAutosave}
      onChange={scheduleAutosave}
    >
      <input type="hidden" name="proposalId" value={draftId} readOnly />

      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Studio progress</p>
            <h3 className="mt-3 font-display text-2xl text-ink">Live memo check</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
              This panel updates while you write. It shows what is already strong, what still needs
              revision, and whether the draft is saving in the background.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm text-ink/70">
            {draftCheck.completeCount} of {draftCheck.totalCount} core parts in place
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="font-medium text-ink">Autosave</p>
            <p
              className={`mt-3 text-sm ${
                autosaveState.tone === "error"
                  ? "text-danger"
                  : autosaveState.tone === "saved"
                    ? "text-success"
                    : "text-ink/68"
              }`}
            >
              {autosaveState.message}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-medium text-ink">Still missing</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                {draftCheck.critical.length > 0 ? (
                  draftCheck.critical.map((line) => (
                    <li key={line} className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                      {line}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                    Core memo sections look complete.
                  </li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-medium text-ink">Needs smoothing</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                {draftCheck.caution.length > 0 ? (
                  draftCheck.caution.map((line) => (
                    <li key={line} className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                      {line}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                    No extra cautions right now.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 1</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl text-ink">Choose the issue and policy target</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
              Start with the league problem. Then connect your memo to the active RuleSet so
              your reform has a clear baseline.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm text-ink/70">
            Final output: <span className="font-medium text-ink">{publicationTypeLabels.POLICY_MEMO}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input
            name="title"
            defaultValue={initial?.title ?? ""}
            placeholder="Policy memo title"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <select
            name="issueId"
            defaultValue={initial?.issueId ?? ""}
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">Choose issue</option>
            {issues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                {issue.title}
                {issue.team ? ` · ${issue.team.name}` : ""}
              </option>
            ))}
          </select>
        </div>

        <select
          name="ruleSetId"
          defaultValue={initial?.ruleSetId ?? ruleSets[0]?.id ?? ""}
          className="mt-4 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        >
          {ruleSets.map((ruleSet) => (
            <option key={ruleSet.id} value={ruleSet.id}>
              RuleSet v{ruleSet.version}
            </option>
          ))}
        </select>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 2</p>
        <h3 className="mt-3 font-display text-2xl text-ink">Write the memo opening</h3>
        <div className="mt-5 grid gap-4">
          <textarea
            name="abstract"
            defaultValue={initial?.abstract ?? ""}
            rows={4}
            placeholder="Executive summary: explain the problem, your reform idea, and what you expect to change."
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="methodsSummary"
            defaultValue={initial?.methodsSummary ?? ""}
            rows={3}
            placeholder="Methods summary: how are you studying this proposal?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            name="publicationSlug"
            defaultValue={initial?.publicationSlug ?? ""}
            placeholder="Optional publication slug"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {stepStatus.opening.map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-white/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{item.label}</p>
                <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] ${statusTone(item.ready)}`}>
                  {item.ready ? "Ready" : "Keep writing"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/66">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 3</p>
        <h3 className="mt-3 font-display text-2xl text-ink">Build the policy memo body</h3>
        <div className="mt-5 grid gap-4">
          <textarea
            name="problem"
            defaultValue={initial?.problem ?? fieldValue(null, "problem")}
            rows={4}
            placeholder="Problem: what is going wrong in the league?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="currentRuleContext"
            defaultValue={initial?.currentRuleContext ?? ""}
            rows={4}
            placeholder="Current rule context: what does the league do now?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="proposedChange"
            defaultValue={initial?.proposedChange ?? ""}
            rows={4}
            placeholder="Proposed change: what should the rule become?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="expectedImpact"
            defaultValue={initial?.impactAnalysis ?? ""}
            rows={4}
            placeholder="Impact analysis: who benefits, who loses flexibility, and why?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="tradeoffs"
            defaultValue={initial?.tradeoffs ?? ""}
            rows={4}
            placeholder="Tradeoffs: what new pressure might this reform create?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="recommendation"
            defaultValue={initial?.recommendation ?? ""}
            rows={4}
            placeholder="Recommendation: what should the commissioner or league do next?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stepStatus.memoBody.map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-white/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{item.label}</p>
                <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] ${statusTone(item.ready)}`}>
                  {item.ready ? "Ready" : "Needs work"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/66">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 4</p>
        <h3 className="mt-3 font-display text-2xl text-ink">Add the rule diff and sandbox</h3>
        <textarea
          name="diffJson"
          rows={10}
          defaultValue={
            initial?.diffJson ??
            `{\n  "changes": [\n    {\n      "op": "replace",\n      "path": "/revenueSharingRate",\n      "value": 0.16,\n      "reason": "Raise the league sharing pool slightly."\n    }\n  ]\n}`
          }
          className="mt-5 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent"
        />

        <input
          type="hidden"
          name="sandboxResultJson"
          value={sandboxResult ? JSON.stringify(sandboxResult) : ""}
          readOnly
        />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runSandbox}
            disabled={isPending}
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-ink"
          >
            {isPending ? "Running sandbox..." : "Run sandbox model"}
          </button>
          <div className="rounded-2xl border border-line bg-white/60 px-4 py-3 text-sm text-ink/70">
            Use the sandbox before submitting so the memo includes evidence, not just an idea.
          </div>
        </div>

        {sandboxError ? (
          <p className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {sandboxError}
          </p>
        ) : null}

        <div className="mt-5 rounded-2xl border border-line bg-white/55 p-4">
          <p className="font-medium text-ink">Sandbox impact report</p>
          {sandboxResult ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="text-sm text-ink/60">Parity delta</p>
                <p className="mt-2 font-display text-3xl text-ink">{sandboxResult.delta.parityIndex}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="text-sm text-ink/60">Tax concentration delta</p>
                <p className="mt-2 font-display text-3xl text-ink">{sandboxResult.delta.taxConcentration}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="text-sm text-ink/60">Small vs big delta</p>
                <p className="mt-2 font-display text-3xl text-ink">
                  {sandboxResult.delta.smallVsBigCompetitiveness}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="text-sm text-ink/60">Revenue inequality delta</p>
                <p className="mt-2 font-display text-3xl text-ink">{sandboxResult.delta.revenueInequality}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-ink/68">
              Run the sandbox to compare the baseline rules against your proposed rule diff.
            </p>
          )}
        </div>

        <textarea
          name="sandboxInterpretation"
          defaultValue={initial?.sandboxInterpretation ?? ""}
          rows={4}
          placeholder="Sandbox interpretation: what do these results mean for the league?"
          className="mt-4 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stepStatus.modelReadiness.map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-white/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{item.label}</p>
                <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] ${statusTone(item.ready)}`}>
                  {item.ready ? "Ready" : "Needed"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/66">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 5</p>
        <h3 className="mt-3 font-display text-2xl text-ink">Add references and publication details</h3>
        <div className="mt-5 grid gap-4">
          <textarea
            name="references"
            rows={4}
            defaultValue={initial?.referencesText ?? ""}
            placeholder="References, one per line: Label | https://... | DATASET | note"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            name="keywords"
            defaultValue={initial?.keywordsText ?? ""}
            placeholder="Keywords separated by commas"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="keyTakeaways"
            rows={4}
            defaultValue={initial?.keyTakeawaysText ?? ""}
            placeholder="Key takeaways, one per line"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 6</p>
        <h3 className="mt-3 font-display text-2xl text-ink">Review before you submit</h3>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="font-medium text-ink">Strong policy memos usually include</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
              <li className="rounded-2xl border border-line bg-white/70 px-4 py-3">A clear problem statement tied to a live issue.</li>
              <li className="rounded-2xl border border-line bg-white/70 px-4 py-3">A concrete rule change, not only a complaint.</li>
              <li className="rounded-2xl border border-line bg-white/70 px-4 py-3">An interpretation of the sandbox results.</li>
              <li className="rounded-2xl border border-line bg-white/70 px-4 py-3">Tradeoffs and references that an outside reader can follow.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="font-medium text-ink">External publication checks</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
              <li className="rounded-2xl border border-line bg-white/70 px-4 py-3">The title and abstract should still make sense outside the classroom.</li>
              <li className="rounded-2xl border border-line bg-white/70 px-4 py-3">The memo should define BOW-specific ideas the first time they appear.</li>
              <li className="rounded-2xl border border-line bg-white/70 px-4 py-3">The recommendation and references should be clean enough for a web article or PDF later.</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            name="intent"
            value="DRAFT"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-ink"
          >
            Save draft
          </button>
          <button
            type="submit"
            name="intent"
            value="SUBMITTED"
            className="rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            {intentLabel}
          </button>
        </div>
      </section>
    </form>
  );
}
