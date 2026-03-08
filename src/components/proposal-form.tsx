"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Issue, RuleSet } from "@prisma/client";

import { ProposalStepAbstract } from "@/components/proposal-step-abstract";
import { ProposalStepAction } from "@/components/proposal-step-action";
import { ProposalStepCurrentRule } from "@/components/proposal-step-current-rule";
import { ProposalStepImpact } from "@/components/proposal-step-impact";
import { ProposalStepIssue } from "@/components/proposal-step-issue";
import { ProposalStepProblem } from "@/components/proposal-step-problem";
import { ProposalStepReform } from "@/components/proposal-step-reform";
import { ProposalStepReview } from "@/components/proposal-step-review";
import { ProposalStepRuleset } from "@/components/proposal-step-ruleset";
import { ProposalStepSandbox } from "@/components/proposal-step-sandbox";
import { ProposalStepTitle } from "@/components/proposal-step-title";
import { ProposalStepTradeoffs } from "@/components/proposal-step-tradeoffs";
import { WizardFooter } from "@/components/wizard-footer";
import { WizardShell } from "@/components/wizard-shell";
import { WizardStepRail } from "@/components/wizard-step-rail";
import {
  assessProposalCoach,
  createInitialProposalCoachValues,
  getProposalCoachDomId,
  getSandboxFingerprint,
  isProposalCoachStepId,
  proposalCoachStepOrder,
  proposalCoachSteps,
  type ProposalCoachFieldId,
  type ProposalCoachStepId,
  type ProposalCoachValues
} from "@/lib/proposal-wizard";
import type { SandboxImpactReport } from "@/lib/types";

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

type AutosaveState = {
  tone: "idle" | "saving" | "saved" | "error";
  message: string;
};

const fieldNameById: Record<Exclude<ProposalCoachFieldId, "sandboxResult">, string> = {
  issueId: "issueId",
  ruleSetId: "ruleSetId",
  title: "title",
  abstract: "abstract",
  problem: "problem",
  currentRuleContext: "currentRuleContext",
  proposedChange: "proposedChange",
  expectedImpact: "expectedImpact",
  tradeoffs: "tradeoffs",
  recommendation: "recommendation",
  methodsSummary: "methodsSummary",
  diffJson: "diffJson",
  sandboxInterpretation: "sandboxInterpretation",
  references: "references",
  keywords: "keywords",
  keyTakeaways: "keyTakeaways",
  publicationSlug: "publicationSlug"
};

const proposalStepByFieldId: Record<Exclude<ProposalCoachFieldId, "sandboxResult">, ProposalCoachStepId> = {
  issueId: "issue",
  ruleSetId: "ruleset",
  title: "title",
  abstract: "abstract",
  problem: "problem",
  currentRuleContext: "currentRule",
  proposedChange: "reform",
  expectedImpact: "impact",
  tradeoffs: "tradeoffs",
  recommendation: "action",
  methodsSummary: "action",
  diffJson: "sandbox",
  sandboxInterpretation: "sandbox",
  references: "review",
  keywords: "review",
  keyTakeaways: "review",
  publicationSlug: "review"
};

function hasAnyDraftContent(values: ProposalCoachValues, sandboxResult: SandboxImpactReport | null) {
  return Object.values(values).some((value) => value.trim().length > 0) || Boolean(sandboxResult);
}

function buildProposalFormData(
  values: ProposalCoachValues,
  draftId: string,
  sandboxResult: SandboxImpactReport | null
) {
  const formData = new FormData();

  if (draftId) {
    formData.set("proposalId", draftId);
  }

  for (const [fieldId, name] of Object.entries(fieldNameById) as Array<
    [Exclude<ProposalCoachFieldId, "sandboxResult">, string]
  >) {
    formData.set(name, values[fieldId]);
  }

  formData.set("sandboxResultJson", sandboxResult ? JSON.stringify(sandboxResult) : "");
  return formData;
}

function applyStarter(
  currentValue: string,
  starter: string,
  fieldId: ProposalCoachFieldId
) {
  if (!currentValue.trim()) {
    return starter;
  }

  if (fieldId === "title" || fieldId === "publicationSlug" || fieldId === "keywords") {
    return currentValue;
  }

  if (currentValue.includes(starter)) {
    return currentValue;
  }

  return `${currentValue.trim()}\n\n${starter}`;
}

function resolveStep(stepParam: string | null, fallback: ProposalCoachStepId) {
  return isProposalCoachStepId(stepParam) ? stepParam : fallback;
}

function replaceStepUrl(pathname: string, searchParams: string, stepId: string) {
  const params = new URLSearchParams(searchParams);

  if (params.get("step") === stepId) {
    return;
  }

  params.set("step", stepId);
  const nextUrl = `${pathname}?${params.toString()}`;

  window.history.replaceState(window.history.state, "", nextUrl);
}

function isProposalRepairFieldId(
  value: string | null
): value is Exclude<ProposalCoachFieldId, "sandboxResult"> {
  return Boolean(value && value in proposalStepByFieldId);
}

export function ProposalForm({ issues, ruleSets, action, initial, intentLabel }: ProposalFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const autosaveTimerRef = useRef<number | null>(null);
  const stepSyncRef = useRef(false);
  const autosaveReadyRef = useRef(false);
  const currentStepQuery = searchParams.get("step");
  const beginnerMode = searchParams.get("beginner") === "1";
  const repairQuery = searchParams.get("repair");
  const repairFieldId = isProposalRepairFieldId(repairQuery) ? repairQuery : null;
  const repairStepId = repairFieldId ? proposalStepByFieldId[repairFieldId] : null;
  const [draftId, setDraftId] = useState(initial?.id ?? "");
  const [values, setValues] = useState<ProposalCoachValues>(() =>
    createInitialProposalCoachValues({
      title: initial?.title ?? "",
      issueId: initial?.issueId ?? "",
      ruleSetId: initial?.ruleSetId ?? ruleSets[0]?.id ?? "",
      abstract: initial?.abstract ?? "",
      methodsSummary: initial?.methodsSummary ?? "",
      problem: initial?.problem ?? "",
      currentRuleContext: initial?.currentRuleContext ?? "",
      proposedChange: initial?.proposedChange ?? "",
      expectedImpact: initial?.impactAnalysis ?? "",
      tradeoffs: initial?.tradeoffs ?? "",
      sandboxInterpretation: initial?.sandboxInterpretation ?? "",
      recommendation: initial?.recommendation ?? "",
      diffJson: initial?.diffJson ?? "",
      references: initial?.referencesText ?? "",
      keywords: initial?.keywordsText ?? "",
      keyTakeaways: initial?.keyTakeawaysText ?? "",
      publicationSlug: initial?.publicationSlug ?? ""
    })
  );
  const [sandboxResult, setSandboxResult] = useState<SandboxImpactReport | null>(
    initial?.sandboxResult ?? null
  );
  const [sandboxRunFingerprint, setSandboxRunFingerprint] = useState<string | null>(() =>
    initial?.sandboxResult ? getSandboxFingerprint(initial.ruleSetId, initial.diffJson) : null
  );
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({
    tone: "idle",
    message: initial?.id ? "Draft loaded." : "Autosave starts after you begin writing."
  });
  const [carryForwardWarnings, setCarryForwardWarnings] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const assessment = assessProposalCoach(values, {
    result: sandboxResult,
    runFingerprint: sandboxRunFingerprint
  });

  const [currentStepId, setCurrentStepId] = useState<ProposalCoachStepId>(() =>
    repairStepId ?? resolveStep(currentStepQuery, assessment.firstIncompleteStepId)
  );

  const currentStepIndex = proposalCoachStepOrder.indexOf(currentStepId);
  const currentStep = proposalCoachSteps[currentStepId];
  const currentStepEvaluation = assessment.steps[currentStepId];
  const completedSteps = proposalCoachStepOrder.filter((stepId) => {
    const status = assessment.steps[stepId].status;
    return status === "strong" || status === "done";
  }).length;
  const visibleFieldIds = currentStep.fieldIds.filter((fieldId) => fieldId !== "sandboxResult");

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!stepSyncRef.current) {
      stepSyncRef.current = true;
      const requestedStep =
        repairStepId ?? resolveStep(currentStepQuery, assessment.firstIncompleteStepId);
      setCurrentStepId(requestedStep);
      return;
    }

    const requestedStep =
      repairStepId ?? resolveStep(currentStepQuery, assessment.firstIncompleteStepId);

    if (requestedStep !== currentStepId) {
      setCurrentStepId(requestedStep);
    }
  }, [assessment.firstIncompleteStepId, currentStepId, currentStepQuery, repairStepId]);

  useEffect(() => {
    replaceStepUrl(pathname, searchParams.toString(), currentStepId);
  }, [currentStepId, pathname, searchParams]);

  useEffect(() => {
    if (!repairFieldId || !repairStepId) {
      return;
    }

    if (repairStepId !== currentStepId) {
      setCurrentStepId(repairStepId);
      return;
    }

    window.setTimeout(() => {
      const element = document.getElementById(getProposalCoachDomId(repairFieldId));
      element?.focus();
    }, 40);
  }, [currentStepId, repairFieldId, repairStepId]);

  const performAutosave = useCallback(async () => {
    if (!hasAnyDraftContent(values, sandboxResult) && !draftId) {
      return;
    }

    setAutosaveState({
      tone: "saving",
      message: "Saving memo draft..."
    });

    try {
      const response = await fetch("/api/studio/proposal-autosave", {
        method: "POST",
        body: buildProposalFormData(values, draftId, sandboxResult)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Autosave failed.");
      }

      if (result.id && result.id !== draftId) {
        setDraftId(result.id);
        if (!initial?.id && result.editUrl) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("step", currentStepId);
          router.replace(`${result.editUrl}?${params.toString()}`, { scroll: false });
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
  }, [currentStepId, draftId, initial?.id, router, sandboxResult, searchParams, values]);

  useEffect(() => {
    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true;
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void performAutosave();
    }, 900);
  }, [performAutosave]);

  async function handleManualDraftSave() {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    await performAutosave();
  }

  function updateField(fieldId: Exclude<ProposalCoachFieldId, "sandboxResult">, value: string) {
    setValues((current) => ({
      ...current,
      [fieldId]: value
    }));
  }

  function insertStarter(fieldId: Exclude<ProposalCoachFieldId, "sandboxResult">, starter: string) {
    setValues((current) => ({
      ...current,
      [fieldId]: applyStarter(current[fieldId], starter, fieldId)
    }));
  }

  function focusFirstWeakField(stepId: ProposalCoachStepId) {
    const targetField =
      proposalCoachSteps[stepId].fieldIds.find((fieldId) => {
        if (fieldId === "sandboxResult") {
          return !assessment.fields.sandboxResult.complete;
        }

        return !assessment.fields[fieldId].complete;
      }) ?? proposalCoachSteps[stepId].fieldIds[0];

    const focusField = targetField === "sandboxResult" ? "diffJson" : targetField;
    const element = document.getElementById(getProposalCoachDomId(focusField));
    element?.focus();
  }

  function moveToStep(nextStepId: ProposalCoachStepId, withWarnings: boolean) {
    const warningItems = withWarnings ? currentStepEvaluation.missingItems : [];
    setCarryForwardWarnings(warningItems);
    setCurrentStepId(nextStepId);
    window.setTimeout(() => {
      focusFirstWeakField(nextStepId);
    }, 30);
  }

  function goBack() {
    if (currentStepIndex <= 0) {
      return;
    }

    setCarryForwardWarnings([]);
    setCurrentStepId(proposalCoachStepOrder[currentStepIndex - 1]);
  }

  function goNext() {
    const nextStepId = proposalCoachStepOrder[currentStepIndex + 1];
    if (!nextStepId) {
      return;
    }

    moveToStep(nextStepId, currentStepEvaluation.missingItems.length > 0);
  }

  function selectFromRail(stepId: ProposalCoachStepId) {
    const targetIndex = proposalCoachStepOrder.indexOf(stepId);
    if (targetIndex > currentStepIndex && !assessment.steps[stepId].complete) {
      return;
    }

    setCarryForwardWarnings([]);
    setCurrentStepId(stepId);
  }

  function runSandbox() {
    const currentFingerprint = getSandboxFingerprint(values.ruleSetId, values.diffJson);

    startTransition(async () => {
      try {
        setSandboxError(null);
        const response = await fetch("/api/sandbox", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ruleSetId: values.ruleSetId,
            diff: JSON.parse(values.diffJson)
          })
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Sandbox run failed.");
        }

        setSandboxResult(payload);
        setSandboxRunFingerprint(currentFingerprint);
      } catch (error) {
        setSandboxError(error instanceof Error ? error.message : "Sandbox run failed.");
      }
    });
  }

  function renderHiddenFields() {
    const activeFieldNames = new Set(visibleFieldIds.map((fieldId) => fieldNameById[fieldId]));

    return (
      <>
        {(
          Object.entries(fieldNameById) as Array<[Exclude<ProposalCoachFieldId, "sandboxResult">, string]>
        ).map(([fieldId, name]) =>
          activeFieldNames.has(name) ? null : (
            <input key={fieldId} type="hidden" name={name} value={values[fieldId]} readOnly />
          )
        )}
        <input
          type="hidden"
          name="proposalId"
          value={draftId}
          readOnly
        />
        <input
          type="hidden"
          name="sandboxResultJson"
          value={sandboxResult ? JSON.stringify(sandboxResult) : ""}
          readOnly
        />
      </>
    );
  }

  const railItems = proposalCoachStepOrder.map((stepId, index) => ({
    id: stepId,
    title: proposalCoachSteps[stepId].title,
    shortTitle: proposalCoachSteps[stepId].shortTitle,
    status: assessment.steps[stepId].status,
    current: currentStepId === stepId,
    disabled: index > currentStepIndex && !assessment.steps[stepId].complete
  }));

  function renderCurrentStep() {
    switch (currentStepId) {
      case "issue":
        return (
          <ProposalStepIssue
            step={currentStep}
            evaluation={currentStepEvaluation}
            fieldEvaluation={assessment.fields.issueId}
            value={values.issueId}
            issues={issues}
            onChange={(value) => updateField("issueId", value)}
            warningItems={carryForwardWarnings}
          />
        );
      case "ruleset":
        return (
          <ProposalStepRuleset
            step={currentStep}
            evaluation={currentStepEvaluation}
            fieldEvaluation={assessment.fields.ruleSetId}
            value={values.ruleSetId}
            ruleSets={ruleSets}
            onChange={(value) => updateField("ruleSetId", value)}
            warningItems={carryForwardWarnings}
          />
        );
      case "title":
        return (
          <ProposalStepTitle
            step={currentStep}
            evaluation={currentStepEvaluation}
            fieldEvaluation={assessment.fields.title}
            value={values.title}
            onChange={(value) => updateField("title", value)}
            onUseStarter={(starter) => insertStarter("title", starter)}
            warningItems={carryForwardWarnings}
          />
        );
      case "abstract":
        return (
          <ProposalStepAbstract
            step={currentStep}
            evaluation={currentStepEvaluation}
            fieldEvaluation={assessment.fields.abstract}
            value={values.abstract}
            onChange={(value) => updateField("abstract", value)}
            onUseStarter={(starter) => insertStarter("abstract", starter)}
            warningItems={carryForwardWarnings}
          />
        );
      case "problem":
        return (
          <ProposalStepProblem
            step={currentStep}
            evaluation={currentStepEvaluation}
            fieldEvaluation={assessment.fields.problem}
            value={values.problem}
            onChange={(value) => updateField("problem", value)}
            onUseStarter={(starter) => insertStarter("problem", starter)}
            warningItems={carryForwardWarnings}
          />
        );
      case "currentRule":
        return (
          <ProposalStepCurrentRule
            step={currentStep}
            evaluation={currentStepEvaluation}
            fieldEvaluation={assessment.fields.currentRuleContext}
            value={values.currentRuleContext}
            onChange={(value) => updateField("currentRuleContext", value)}
            onUseStarter={(starter) => insertStarter("currentRuleContext", starter)}
            warningItems={carryForwardWarnings}
          />
        );
      case "reform":
        return (
          <ProposalStepReform
            step={currentStep}
            evaluation={currentStepEvaluation}
            fieldEvaluation={assessment.fields.proposedChange}
            value={values.proposedChange}
            onChange={(value) => updateField("proposedChange", value)}
            onUseStarter={(starter) => insertStarter("proposedChange", starter)}
            warningItems={carryForwardWarnings}
          />
        );
      case "impact":
        return (
          <ProposalStepImpact
            step={currentStep}
            evaluation={currentStepEvaluation}
            fieldEvaluation={assessment.fields.expectedImpact}
            value={values.expectedImpact}
            onChange={(value) => updateField("expectedImpact", value)}
            onUseStarter={(starter) => insertStarter("expectedImpact", starter)}
            warningItems={carryForwardWarnings}
          />
        );
      case "tradeoffs":
        return (
          <ProposalStepTradeoffs
            step={currentStep}
            evaluation={currentStepEvaluation}
            fieldEvaluation={assessment.fields.tradeoffs}
            value={values.tradeoffs}
            onChange={(value) => updateField("tradeoffs", value)}
            onUseStarter={(starter) => insertStarter("tradeoffs", starter)}
            warningItems={carryForwardWarnings}
          />
        );
      case "action":
        return (
          <ProposalStepAction
            step={currentStep}
            evaluation={currentStepEvaluation}
            recommendationEvaluation={assessment.fields.recommendation}
            methodsEvaluation={assessment.fields.methodsSummary}
            recommendation={values.recommendation}
            methodsSummary={values.methodsSummary}
            onChangeRecommendation={(value) => updateField("recommendation", value)}
            onChangeMethods={(value) => updateField("methodsSummary", value)}
            onUseRecommendationStarter={(starter) => insertStarter("recommendation", starter)}
            onUseMethodsStarter={(starter) => insertStarter("methodsSummary", starter)}
            warningItems={carryForwardWarnings}
          />
        );
      case "sandbox":
        return (
          <ProposalStepSandbox
            step={currentStep}
            evaluation={currentStepEvaluation}
            diffEvaluation={assessment.fields.diffJson}
            sandboxEvaluation={assessment.fields.sandboxResult}
            interpretationEvaluation={assessment.fields.sandboxInterpretation}
            diffJson={values.diffJson}
            sandboxInterpretation={values.sandboxInterpretation}
            sandboxResult={sandboxResult}
            sandboxFreshness={assessment.sandboxFreshness}
            sandboxError={sandboxError}
            isPending={isPending}
            diffError={assessment.diffError}
            onChangeDiff={(value) => updateField("diffJson", value)}
            onChangeInterpretation={(value) => updateField("sandboxInterpretation", value)}
            onUseDiffStarter={(starter) => insertStarter("diffJson", starter)}
            onUseInterpretationStarter={(starter) => insertStarter("sandboxInterpretation", starter)}
            onRunSandbox={runSandbox}
            warningItems={carryForwardWarnings}
          />
        );
      case "review":
        return (
          <ProposalStepReview
            step={currentStep}
            evaluation={currentStepEvaluation}
            referencesEvaluation={assessment.fields.references}
            keywordsEvaluation={assessment.fields.keywords}
            takeawaysEvaluation={assessment.fields.keyTakeaways}
            slugEvaluation={assessment.fields.publicationSlug}
            references={values.references}
            keywords={values.keywords}
            keyTakeaways={values.keyTakeaways}
            publicationSlug={values.publicationSlug}
            blockers={assessment.reviewBuckets.blockers}
            polish={assessment.reviewBuckets.polish}
            strengths={assessment.reviewBuckets.strengths}
            onChangeReferences={(value) => updateField("references", value)}
            onChangeKeywords={(value) => updateField("keywords", value)}
            onChangeTakeaways={(value) => updateField("keyTakeaways", value)}
            onChangeSlug={(value) => updateField("publicationSlug", value)}
            onUseReferencesStarter={(starter) => insertStarter("references", starter)}
            onUseKeywordsStarter={(starter) => insertStarter("keywords", starter)}
            onUseTakeawaysStarter={(starter) => insertStarter("keyTakeaways", starter)}
            onUseSlugStarter={(starter) => insertStarter("publicationSlug", starter)}
            warningItems={carryForwardWarnings}
          />
        );
    }
  }

  return (
    <form
      action={action}
      className="space-y-6"
      onSubmit={(event) => {
        if (currentStepId !== "review" || !assessment.submitReady) {
          event.preventDefault();
        }
      }}
    >
      {renderHiddenFields()}

      <WizardShell
        progressTitle="Adaptive proposal coach"
        progressDescription="This wizard breaks the memo into tiny decisions, shows what strong work looks like, and blocks submission until the proposal is clear, evidence-backed, and ready for review."
        autosaveMessage={autosaveState.message}
        autosaveTone={autosaveState.tone}
        completedSteps={completedSteps}
        totalSteps={proposalCoachStepOrder.length}
        currentStepName={proposalCoachSteps[currentStepId].shortTitle}
        coachPanel={{
          activeLabel: currentStep.title,
          rightNow: currentStep.rightNow,
          whyItMatters: currentStep.whyItMatters,
          nextMove: currentStepEvaluation.nextMove,
          missingItems: currentStepEvaluation.missingItems,
          strongExample: currentStep.strongExample,
          beginnerMode,
          repairLabel: repairFieldId ? assessment.fields[repairFieldId].label : null
        }}
        rail={<WizardStepRail items={railItems} onSelect={selectFromRail} />}
        footer={
          <WizardFooter
            currentStepNumber={currentStepIndex + 1}
            totalSteps={proposalCoachStepOrder.length}
            nextMove={currentStepEvaluation.nextMove}
            canGoBack={currentStepIndex > 0}
            canGoNext={currentStepIndex < proposalCoachStepOrder.length - 1}
            onSaveDraft={handleManualDraftSave}
            onBack={goBack}
            onNext={goNext}
            submitReady={assessment.submitReady}
            reviewMode={currentStepId === "review"}
            submitLabel={intentLabel}
          />
        }
      >
        {renderCurrentStep()}
      </WizardShell>
    </form>
  );
}
