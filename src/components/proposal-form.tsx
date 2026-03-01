"use client";

import { useRef, useState, useTransition } from "react";

import type { Issue, RuleSet } from "@prisma/client";

import type { SandboxImpactReport } from "@/lib/types";

type ProposalFormProps = {
  issues: Issue[];
  ruleSets: RuleSet[];
  action: (formData: FormData) => void | Promise<void>;
};

export function ProposalForm({ issues, ruleSets, action }: ProposalFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [sandboxResult, setSandboxResult] = useState<SandboxImpactReport | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      } catch (error) {
        setSandboxResult(null);
        setSandboxError(error instanceof Error ? error.message : "Sandbox run failed.");
      }
    });
  }

  return (
    <form ref={formRef} action={action} className="panel p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="title"
          placeholder="Proposal title"
          className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />
        <select
          name="issueId"
          defaultValue=""
          className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">Choose issue</option>
          {issues.map((issue) => (
            <option key={issue.id} value={issue.id}>
              {issue.title}
            </option>
          ))}
        </select>
      </div>

      <select
        name="ruleSetId"
        defaultValue={ruleSets[0]?.id ?? ""}
        className="mt-4 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
      >
        {ruleSets.map((ruleSet) => (
          <option key={ruleSet.id} value={ruleSet.id}>
            RuleSet v{ruleSet.version}
          </option>
        ))}
      </select>

      <div className="mt-4 grid gap-4">
        <textarea
          name="problem"
          rows={4}
          placeholder="Problem statement"
          className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />
        <textarea
          name="proposedChange"
          rows={4}
          placeholder="Proposed change"
          className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />
        <textarea
          name="expectedImpact"
          rows={4}
          placeholder="Expected impact"
          className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />
        <textarea
          name="tradeoffs"
          rows={4}
          placeholder="Tradeoffs"
          className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />
        <textarea
          name="diffJson"
          rows={8}
          defaultValue={`{\n  "changes": [\n    {\n      "op": "replace",\n      "path": "/revenueSharingRate",\n      "value": 0.16,\n      "reason": "Raise the league sharing pool slightly."\n    }\n  ]\n}`}
          className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent"
        />
        <input
          type="hidden"
          name="sandboxResultJson"
          value={sandboxResult ? JSON.stringify(sandboxResult) : ""}
          readOnly
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runSandbox}
            disabled={isPending}
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-ink"
          >
            {isPending ? "Running sandbox..." : "Run sandbox model"}
          </button>
          <button
            type="submit"
            name="intent"
            value="DRAFT"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-ink"
          >
            Save draft
          </button>
        </div>
        <button
          type="submit"
          name="intent"
          value="SUBMITTED"
          className="rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Submit proposal
        </button>
      </div>

      {sandboxError ? (
        <p className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {sandboxError}
        </p>
      ) : null}

      <div className="mt-6 rounded-2xl border border-line bg-white/55 p-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Sandbox impact report</p>
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
            Run the sandbox to compare the baseline rules against your proposed rule diff before saving.
          </p>
        )}
      </div>
    </form>
  );
}
