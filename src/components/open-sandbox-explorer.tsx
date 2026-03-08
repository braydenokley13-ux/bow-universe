"use client";

import { useCallback, useState, useTransition } from "react";

import { saveSandboxScenarioAction } from "@/server/actions";
import { buildDiffFromSliders, isSliderStateDirty, sliderStateFromRules } from "@/lib/sandbox-helpers";
import type { LeagueRulesV1, SandboxImpactReport } from "@/lib/types";

type RuleSetOption = {
  id: string;
  version: number;
  rules: LeagueRulesV1;
};

type OpenSandboxExplorerProps = {
  ruleSets: RuleSetOption[];
};

function deltaLabel(value: number) {
  if (value > 0) return `+${value.toFixed(2)}`;
  return value.toFixed(2);
}

function deltaTone(value: number, positiveIsGood: boolean) {
  if (Math.abs(value) < 0.01) return "text-ink/55";
  if ((value > 0) === positiveIsGood) return "text-success";
  return "text-danger";
}

export function OpenSandboxExplorer({ ruleSets }: OpenSandboxExplorerProps) {
  const [selectedRuleSetId, setSelectedRuleSetId] = useState(ruleSets[0]?.id ?? "");
  const selectedRuleSet = ruleSets.find((rs) => rs.id === selectedRuleSetId);
  const baseline = selectedRuleSet?.rules ?? null;

  const [sliders, setSliders] = useState(() =>
    baseline ? sliderStateFromRules(baseline) : null
  );
  const [result, setResult] = useState<SandboxImpactReport | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Save form state
  const [saveMode, setSaveMode] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [savePublic, setSavePublic] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();

  const handleRuleSetChange = useCallback((id: string) => {
    setSelectedRuleSetId(id);
    const rs = ruleSets.find((r) => r.id === id);
    if (rs) setSliders(sliderStateFromRules(rs.rules));
    setResult(null);
    setSandboxError(null);
  }, [ruleSets]);

  const runSandbox = useCallback(() => {
    if (!baseline || !sliders) return;
    const diff = buildDiffFromSliders(baseline, sliders);
    setSandboxError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleSetId: selectedRuleSetId, diff })
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          setSandboxError(data.error ?? "Sandbox run failed.");
          return;
        }
        const report = (await response.json()) as SandboxImpactReport;
        setResult(report);
      } catch {
        setSandboxError("Network error — could not reach the sandbox.");
      }
    });
  }, [baseline, sliders, selectedRuleSetId]);

  const handleSave = useCallback(() => {
    if (!sliders || !baseline || !saveName.trim()) return;
    const diff = buildDiffFromSliders(baseline, sliders);
    startSaveTransition(async () => {
      const fd = new FormData();
      fd.set("name", saveName.trim());
      fd.set("description", saveDescription.trim());
      fd.set("diffJson", JSON.stringify(diff));
      fd.set("resultJson", result ? JSON.stringify(result) : "");
      fd.set("ruleSetId", selectedRuleSetId);
      fd.set("isPublic", String(savePublic));
      await saveSandboxScenarioAction(fd);
      setSaveSuccess(true);
      setSaveMode(false);
      setSaveName("");
      setSaveDescription("");
      setTimeout(() => setSaveSuccess(false), 3000);
    });
  }, [sliders, baseline, saveName, saveDescription, result, selectedRuleSetId, savePublic]);

  if (!baseline || !sliders) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center">
        <p className="text-sm text-ink/55">No active ruleset found. Ask your commissioner to set one up.</p>
      </div>
    );
  }

  const isDirty = isSliderStateDirty(baseline, sliders);

  return (
    <div className="space-y-6">
      {/* Ruleset selector */}
      {ruleSets.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
            Baseline ruleset
          </label>
          <select
            value={selectedRuleSetId}
            onChange={(e) => handleRuleSetChange(e.target.value)}
            className="rounded-xl border border-line bg-white/80 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {ruleSets.map((rs) => (
              <option key={rs.id} value={rs.id}>
                RuleSet v{rs.version}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sliders */}
      <div className="panel p-6 space-y-6">
        <div className="space-y-1">
          <h3 className="font-display text-xl text-ink">Rule controls</h3>
          <p className="text-sm text-ink/65">
            Adjust the sliders and click Run to see how the changes ripple through the league.
          </p>
        </div>

        <SliderField
          label="Cap growth rate"
          hint="How fast the salary cap rises each season."
          value={sliders.capGrowthRate}
          min={0}
          max={0.15}
          step={0.001}
          format={(v) => `${(v * 100).toFixed(1)}%`}
          onChange={(v) => setSliders((s) => s ? { ...s, capGrowthRate: v } : s)}
          baseline={baseline.capGrowthRate}
        />

        <SliderField
          label="Revenue sharing rate"
          hint="The share of each team's revenue that flows into the league pool."
          value={sliders.revenueSharingRate}
          min={0}
          max={0.35}
          step={0.001}
          format={(v) => `${(v * 100).toFixed(1)}%`}
          onChange={(v) => setSliders((s) => s ? { ...s, revenueSharingRate: v } : s)}
          baseline={baseline.revenueSharingRate}
        />

        <SliderField
          label="Second apron threshold"
          hint="The multiplier of the cap where the second apron penalty kicks in."
          value={sliders.secondApronThreshold}
          min={1.0}
          max={2.0}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}% of cap`}
          onChange={(v) => setSliders((s) => s ? { ...s, secondApronThreshold: v } : s)}
          baseline={baseline.secondApronThreshold}
        />

        {/* Reset */}
        {isDirty && (
          <button
            type="button"
            onClick={() => { setSliders(sliderStateFromRules(baseline)); setResult(null); }}
            className="text-sm text-accent underline-offset-2 hover:underline"
          >
            Reset to baseline
          </button>
        )}
      </div>

      {/* Run button */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runSandbox}
          disabled={isPending || !isDirty}
          className="rounded-full border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Running simulation..." : "Run simulation"}
        </button>
        {!isDirty && !result && (
          <p className="text-sm text-ink/55">Adjust a slider first to enable the simulation.</p>
        )}
        {result && !isDirty && (
          <p className="text-sm text-success">Result matches current slider values.</p>
        )}
      </div>

      {sandboxError && (
        <p className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {sandboxError}
        </p>
      )}

      {/* Results */}
      {result && (
        <div className="panel p-6 space-y-4">
          <h3 className="font-display text-xl text-ink">Simulation results</h3>
          <p className="text-sm text-ink/65">
            These numbers show how the proposed rule changes would affect the league compared to the current baseline.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricDelta
              label="Parity index"
              baseline={result.baseline.parityIndex}
              proposed={result.proposed.parityIndex}
              delta={result.delta.parityIndex}
              hint="Lower = teams are closer together"
              positiveIsGood={false}
            />
            <MetricDelta
              label="Revenue inequality"
              baseline={result.baseline.revenueInequality}
              proposed={result.proposed.revenueInequality}
              delta={result.delta.revenueInequality}
              hint="Lower = more equal revenue distribution"
              positiveIsGood={false}
            />
            <MetricDelta
              label="Tax concentration"
              baseline={result.baseline.taxConcentration}
              proposed={result.proposed.taxConcentration}
              delta={result.delta.taxConcentration}
              hint="Lower = tax burden is more spread out"
              positiveIsGood={false}
            />
            <MetricDelta
              label="Small vs big"
              baseline={result.baseline.smallVsBigCompetitiveness}
              proposed={result.proposed.smallVsBigCompetitiveness}
              delta={result.delta.smallVsBigCompetitiveness}
              hint="Higher = small markets more competitive"
              positiveIsGood={true}
            />
          </div>

          {result.explanation.length > 0 && (
            <div className="space-y-2">
              {result.explanation.map((line, i) => (
                <p key={i} className="rounded-2xl border border-line bg-accent/5 px-4 py-3 text-sm leading-6 text-ink/72">
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* Save scenario */}
          {!saveMode && !saveSuccess && (
            <button
              type="button"
              onClick={() => setSaveMode(true)}
              className="mt-2 rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink hover:border-accent"
            >
              Save this scenario
            </button>
          )}
          {saveSuccess && (
            <p className="text-sm text-success">Scenario saved successfully.</p>
          )}
          {saveMode && (
            <div className="mt-4 rounded-2xl border border-line bg-white/70 p-5 space-y-4">
              <p className="font-medium text-ink">Save as scenario</p>
              <input
                type="text"
                placeholder="Scenario name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full rounded-xl border border-line bg-white/80 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <textarea
                placeholder="Optional description (what were you testing?)"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-line bg-white/80 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <label className="flex items-center gap-2 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={savePublic}
                  onChange={(e) => setSavePublic(e.target.checked)}
                  className="rounded"
                />
                Share with the class (visible to all students)
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !saveName.trim()}
                  className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save scenario"}
                </button>
                <button
                  type="button"
                  onClick={() => setSaveMode(false)}
                  className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
  baseline
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  baseline: number;
}) {
  const isDirty = Math.abs(value - baseline) > step * 0.5;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{label}</p>
          <p className="text-xs text-ink/55">{hint}</p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-sm font-medium ${isDirty ? "text-accent" : "text-ink"}`}>
            {format(value)}
          </p>
          {isDirty && (
            <p className="font-mono text-xs text-ink/45">baseline: {format(baseline)}</p>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}

function MetricDelta({
  label,
  baseline,
  proposed,
  delta,
  hint,
  positiveIsGood
}: {
  label: string;
  baseline: number;
  proposed: number;
  delta: number;
  hint: string;
  positiveIsGood: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-4">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-display text-2xl text-ink">{proposed.toFixed(2)}</p>
        <p className={`text-sm font-medium ${deltaTone(delta, positiveIsGood)}`}>
          {deltaLabel(delta)}
        </p>
      </div>
      <p className="mt-1 text-xs text-ink/50">
        Baseline: {baseline.toFixed(2)} — {hint}
      </p>
    </div>
  );
}
