"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ProjectType } from "@prisma/client";

import {
  ProjectStepBody,
  ProjectStepContext,
  ProjectStepLane,
  ProjectStepLaneSections,
  ProjectStepMission,
  ProjectStepOpening,
  ProjectStepPublish,
  ProjectStepReview
} from "@/components/project-coach-steps";
import { WizardFooter } from "@/components/wizard-footer";
import { WizardShell } from "@/components/wizard-shell";
import { WizardStepRail } from "@/components/wizard-step-rail";
import { getLaneTemplate, projectTypeToPublicationType } from "@/lib/publications";
import {
  artifactLinksToText,
  assessProjectCoach,
  createInitialLaneSectionStore,
  createInitialProjectCoachValues,
  getProjectCoachDomId,
  getProjectCoachSteps,
  isProjectCoachStepId,
  projectCoachStepOrder,
  referencesToText,
  syncLaneSectionStore,
  type ProjectCoachFieldId,
  type ProjectCoachLaneSectionStore,
  type ProjectCoachStepId,
  type ProjectCoachValues
} from "@/lib/project-wizard";
import {
  laneTagLabels,
  projectTypeLabels,
  publicationTypeLabels,
  type ArtifactLink,
  type LaneSectionEntry,
  type LaneTag,
  type ReferenceEntry
} from "@/lib/types";

type ProjectStudioFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  viewerId: string;
  issues: Array<{ id: string; title: string; severity: number }>;
  teams: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  proposals: Array<{ id: string; title: string; issue: { title: string } }>;
  initial?: {
    id?: string;
    title: string;
    summary: string;
    abstract: string;
    essentialQuestion: string;
    methodsSummary: string;
    projectType: ProjectType;
    lanePrimary: LaneTag;
    laneTags: LaneTag[];
    issueIds: string[];
    teamId: string;
    supportingProposalId: string;
    artifactLinks: ArtifactLink[];
    references: ReferenceEntry[];
    keywords: string[];
    keyTakeaways: string[];
    publicationSlug: string;
    findingsMd: string;
    overview: string;
    context: string;
    evidence: string;
    analysis: string;
    recommendations: string;
    reflection: string;
    laneSections: LaneSectionEntry[];
    collaboratorIds: string[];
  };
  intentLabel: string;
};

type AutosaveState = {
  tone: "idle" | "saving" | "saved" | "error";
  message: string;
};

function buildProjectFormData(values: ProjectCoachValues, draftId: string) {
  const formData = new FormData();

  if (draftId) {
    formData.set("projectId", draftId);
  }

  formData.set("title", values.title);
  formData.set("summary", values.summary);
  formData.set("abstract", values.abstract);
  formData.set("essentialQuestion", values.essentialQuestion);
  formData.set("methodsSummary", values.methodsSummary);
  formData.set("projectType", values.projectType);
  formData.set("lanePrimary", values.lanePrimary);
  formData.set("teamId", values.teamId);
  formData.set("supportingProposalId", values.supportingProposalId);
  formData.set("artifactLinks", values.artifactLinks);
  formData.set("references", values.references);
  formData.set("keywords", values.keywords);
  formData.set("keyTakeaways", values.keyTakeaways);
  formData.set("publicationSlug", values.publicationSlug);
  formData.set("findingsMd", values.findingsMd);
  formData.set("overview", values.overview);
  formData.set("context", values.context);
  formData.set("evidence", values.evidence);
  formData.set("analysis", values.analysis);
  formData.set("recommendations", values.recommendations);
  formData.set("reflection", values.reflection);
  formData.set("laneSectionKeys", values.laneSections.map((section) => section.key).join(","));

  for (const laneTag of values.laneTags) {
    formData.append("laneTags", laneTag);
  }

  for (const issueId of values.issueIds) {
    formData.append("issueIds", issueId);
  }

  for (const collaboratorId of values.collaboratorIds) {
    formData.append("collaboratorIds", collaboratorId);
  }

  for (const section of values.laneSections) {
    formData.set(`laneSectionTitle_${section.key}`, section.title);
    formData.set(`laneSectionPrompt_${section.key}`, section.prompt);
    formData.set(`laneSectionValue_${section.key}`, section.value);
  }

  return formData;
}

function hasAnyDraftContent(values: ProjectCoachValues) {
  return (
    values.title.trim().length > 0 ||
    values.summary.trim().length > 0 ||
    values.abstract.trim().length > 0 ||
    values.essentialQuestion.trim().length > 0 ||
    values.methodsSummary.trim().length > 0 ||
    values.overview.trim().length > 0 ||
    values.evidence.trim().length > 0 ||
    values.analysis.trim().length > 0 ||
    values.recommendations.trim().length > 0 ||
    values.references.trim().length > 0 ||
    values.artifactLinks.trim().length > 0 ||
    values.laneSections.some((section) => section.value.trim().length > 0)
  );
}

function applyStarter(currentValue: string, starter: string, fieldId: string) {
  if (!currentValue.trim()) {
    return starter;
  }

  if (fieldId === "publicationSlug" || fieldId === "keywords") {
    return currentValue;
  }

  if (currentValue.includes(starter)) {
    return currentValue;
  }

  return `${currentValue.trim()}\n\n${starter}`;
}

function resolveStep(stepParam: string | null, fallback: ProjectCoachStepId) {
  return isProjectCoachStepId(stepParam) ? stepParam : fallback;
}

function uniqueLaneTags(values: LaneTag[], lanePrimary: LaneTag) {
  return Array.from(new Set([...values, lanePrimary])) as LaneTag[];
}

export function ProjectStudioForm({
  action,
  viewerId,
  issues,
  teams,
  users,
  proposals,
  initial,
  intentLabel
}: ProjectStudioFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const autosaveTimerRef = useRef<number | null>(null);
  const stepSyncRef = useRef(false);
  const autosaveReadyRef = useRef(false);
  const currentStepQuery = searchParams.get("step");
  const VALID_LANE_TAGS: LaneTag[] = ["TOOL_BUILDERS", "POLICY_REFORM_ARCHITECTS", "STRATEGIC_OPERATORS", "ECONOMIC_INVESTIGATORS"];
  const laneQuery = searchParams.get("lane");
  const laneFromUrl: LaneTag | null = laneQuery && VALID_LANE_TAGS.includes(laneQuery as LaneTag) ? (laneQuery as LaneTag) : null;
  const defaultLane: LaneTag = initial?.lanePrimary ?? laneFromUrl ?? "ECONOMIC_INVESTIGATORS";
  const [draftId, setDraftId] = useState(initial?.id ?? "");
  const [laneSectionStore, setLaneSectionStore] = useState<ProjectCoachLaneSectionStore>(() =>
    createInitialLaneSectionStore(defaultLane, initial?.laneSections)
  );
  const [values, setValues] = useState<ProjectCoachValues>(() =>
    createInitialProjectCoachValues({
      lanePrimary: defaultLane,
      projectType:
        initial?.projectType ??
        (defaultLane === "TOOL_BUILDERS"
          ? ProjectType.TOOL
          : defaultLane === "STRATEGIC_OPERATORS"
            ? ProjectType.STRATEGY
            : defaultLane === "POLICY_REFORM_ARCHITECTS"
              ? ProjectType.PROPOSAL_SUPPORT
              : ProjectType.INVESTIGATION),
      laneTags:
        initial?.laneTags && initial.laneTags.length > 0
          ? uniqueLaneTags(initial.laneTags, defaultLane)
          : [defaultLane],
      issueIds: initial?.issueIds ?? [],
      teamId: initial?.teamId ?? "",
      supportingProposalId: initial?.supportingProposalId ?? "",
      collaboratorIds: initial?.collaboratorIds ?? [],
      title: initial?.title ?? "",
      summary: initial?.summary ?? "",
      abstract: initial?.abstract ?? "",
      essentialQuestion: initial?.essentialQuestion ?? "",
      methodsSummary: initial?.methodsSummary ?? "",
      publicationSlug: initial?.publicationSlug ?? "",
      findingsMd: initial?.findingsMd ?? "",
      overview: initial?.overview ?? "",
      context: initial?.context ?? "",
      evidence: initial?.evidence ?? "",
      analysis: initial?.analysis ?? "",
      recommendations: initial?.recommendations ?? "",
      reflection: initial?.reflection ?? "",
      artifactLinks: artifactLinksToText(initial?.artifactLinks ?? []),
      references: referencesToText(initial?.references ?? []),
      keywords: initial?.keywords.join(", ") ?? "",
      keyTakeaways: initial?.keyTakeaways.join("\n") ?? "",
      laneSections: createInitialLaneSectionStore(defaultLane, initial?.laneSections)[defaultLane]
    })
  );
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({
    tone: "idle",
    message: initial?.id ? "Draft loaded." : "Autosave starts after you begin writing."
  });
  const [carryForwardWarnings, setCarryForwardWarnings] = useState<string[]>([]);

  const steps = getProjectCoachSteps(values.lanePrimary);
  const laneTemplate = getLaneTemplate(values.lanePrimary);
  const assessment = assessProjectCoach(values);
  const [currentStepId, setCurrentStepId] = useState<ProjectCoachStepId>(() =>
    resolveStep(currentStepQuery, assessment.firstIncompleteStepId)
  );

  const currentStepIndex = projectCoachStepOrder.indexOf(currentStepId);
  const currentStep = steps[currentStepId];
  const currentStepEvaluation = assessment.steps[currentStepId];
  const currentOutputLabel =
    publicationTypeLabels[projectTypeToPublicationType(values.projectType, values.lanePrimary)];
  const completedSteps = projectCoachStepOrder.filter((stepId) => {
    const status = assessment.steps[stepId].status;
    return status === "strong" || status === "done";
  }).length;

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
      setCurrentStepId(resolveStep(currentStepQuery, assessment.firstIncompleteStepId));
      return;
    }

    if (isProjectCoachStepId(currentStepQuery) && currentStepQuery !== currentStepId) {
      setCurrentStepId(currentStepQuery);
    }
  }, [assessment.firstIncompleteStepId, currentStepId, currentStepQuery]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("step") === currentStepId) {
      return;
    }

    params.set("step", currentStepId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [currentStepId, pathname, router, searchParams]);

  const performAutosave = useCallback(async () => {
    if (!hasAnyDraftContent(values) && !draftId) {
      return;
    }

    setAutosaveState({
      tone: "saving",
      message: "Saving draft..."
    });

    try {
      const response = await fetch("/api/studio/project-autosave", {
        method: "POST",
        body: buildProjectFormData(values, draftId)
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
  }, [draftId, initial?.id, router, values]);

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

  function updateField(fieldId: Exclude<ProjectCoachFieldId, "laneSections">, value: string) {
    setValues((current) => ({
      ...current,
      [fieldId]: value
    }));
  }

  function insertStarter(fieldId: string, starter: string) {
    if (fieldId.startsWith("laneSection:")) {
      const key = fieldId.replace("laneSection:", "");
      updateLaneSection(key, applyStarter(values.laneSections.find((section) => section.key === key)?.value ?? "", starter, fieldId));
      return;
    }

    setValues((current) => ({
      ...current,
      [fieldId]: applyStarter(current[fieldId as Exclude<ProjectCoachFieldId, "laneSections">] as string, starter, fieldId)
    }));
  }

  function updateLaneSection(key: string, value: string) {
    setLaneSectionStore((currentStore) => {
      const nextStore = syncLaneSectionStore(currentStore, values.lanePrimary);
      const nextLaneSections = nextStore[values.lanePrimary].map((section) =>
        section.key === key ? { ...section, value } : section
      );
      const updatedStore = {
        ...nextStore,
        [values.lanePrimary]: nextLaneSections
      };

      setValues((currentValues) => ({
        ...currentValues,
        laneSections: nextLaneSections
      }));

      return updatedStore;
    });
  }

  function changeLane(nextLane: LaneTag) {
    setLaneSectionStore((currentStore) => {
      const nextStore = syncLaneSectionStore(currentStore, nextLane);
      setValues((currentValues) => ({
        ...currentValues,
        lanePrimary: nextLane,
        laneTags: uniqueLaneTags(currentValues.laneTags, nextLane),
        laneSections: nextStore[nextLane]
      }));
      return nextStore;
    });
  }

  function changeProjectType(projectType: ProjectType) {
    setValues((current) => ({
      ...current,
      projectType
    }));
  }

  function toggleLaneTag(lane: LaneTag) {
    setValues((current) => {
      const alreadySelected = current.laneTags.includes(lane);
      if (lane === current.lanePrimary && alreadySelected) {
        return current;
      }

      return {
        ...current,
        laneTags: alreadySelected
          ? current.laneTags.filter((entry) => entry !== lane)
          : [...current.laneTags, lane]
      };
    });
  }

  function toggleArrayValue<K extends "issueIds" | "collaboratorIds">(fieldId: K, value: string) {
    setValues((current) => {
      const nextValues = current[fieldId].includes(value)
        ? current[fieldId].filter((entry) => entry !== value)
        : [...current[fieldId], value];

      return {
        ...current,
        [fieldId]: nextValues
      };
    });
  }

  function focusFirstWeakField(stepId: ProjectCoachStepId) {
    const stepDefinition = steps[stepId];
    const targetField =
      stepDefinition.fieldIds.find((fieldId) => !assessment.fields[fieldId].complete) ??
      stepDefinition.fieldIds[0];

    if (targetField === "laneSections") {
      const firstIncompleteSection = assessment.laneSectionEvaluations.find((section) => !section.complete);
      const element = document.getElementById(
        firstIncompleteSection
          ? `project-field-laneSection-${firstIncompleteSection.key}`
          : `project-field-laneSection-${values.laneSections[0]?.key ?? ""}`
      );
      element?.focus();
      return;
    }

    const element = document.getElementById(getProjectCoachDomId(targetField));
    element?.focus();
  }

  function moveToStep(nextStepId: ProjectCoachStepId, withWarnings: boolean) {
    setCarryForwardWarnings(withWarnings ? currentStepEvaluation.missingItems : []);
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
    setCurrentStepId(projectCoachStepOrder[currentStepIndex - 1]);
  }

  function goNext() {
    const nextStepId = projectCoachStepOrder[currentStepIndex + 1];
    if (!nextStepId) {
      return;
    }

    moveToStep(nextStepId, currentStepEvaluation.missingItems.length > 0);
  }

  function selectFromRail(stepId: ProjectCoachStepId) {
    const targetIndex = projectCoachStepOrder.indexOf(stepId);
    if (targetIndex > currentStepIndex && !assessment.steps[stepId].complete) {
      return;
    }

    setCarryForwardWarnings([]);
    setCurrentStepId(stepId);
  }

  function renderHiddenFields() {
    return (
      <>
        <input type="hidden" name="projectId" value={draftId} readOnly />
        <input type="hidden" name="title" value={values.title} readOnly />
        <input type="hidden" name="summary" value={values.summary} readOnly />
        <input type="hidden" name="abstract" value={values.abstract} readOnly />
        <input type="hidden" name="essentialQuestion" value={values.essentialQuestion} readOnly />
        <input type="hidden" name="methodsSummary" value={values.methodsSummary} readOnly />
        <input type="hidden" name="projectType" value={values.projectType} readOnly />
        <input type="hidden" name="lanePrimary" value={values.lanePrimary} readOnly />
        <input type="hidden" name="teamId" value={values.teamId} readOnly />
        <input type="hidden" name="supportingProposalId" value={values.supportingProposalId} readOnly />
        <input type="hidden" name="artifactLinks" value={values.artifactLinks} readOnly />
        <input type="hidden" name="references" value={values.references} readOnly />
        <input type="hidden" name="keywords" value={values.keywords} readOnly />
        <input type="hidden" name="keyTakeaways" value={values.keyTakeaways} readOnly />
        <input type="hidden" name="publicationSlug" value={values.publicationSlug} readOnly />
        <input type="hidden" name="findingsMd" value={values.findingsMd} readOnly />
        <input type="hidden" name="overview" value={values.overview} readOnly />
        <input type="hidden" name="context" value={values.context} readOnly />
        <input type="hidden" name="evidence" value={values.evidence} readOnly />
        <input type="hidden" name="analysis" value={values.analysis} readOnly />
        <input type="hidden" name="recommendations" value={values.recommendations} readOnly />
        <input type="hidden" name="reflection" value={values.reflection} readOnly />
        <input
          type="hidden"
          name="laneSectionKeys"
          value={values.laneSections.map((section) => section.key).join(",")}
          readOnly
        />

        {values.laneTags.map((laneTag) => (
          <input key={`lane-tag-${laneTag}`} type="hidden" name="laneTags" value={laneTag} readOnly />
        ))}
        {values.issueIds.map((issueId) => (
          <input key={`issue-${issueId}`} type="hidden" name="issueIds" value={issueId} readOnly />
        ))}
        {values.collaboratorIds.map((collaboratorId) => (
          <input
            key={`collaborator-${collaboratorId}`}
            type="hidden"
            name="collaboratorIds"
            value={collaboratorId}
            readOnly
          />
        ))}
        {values.laneSections.map((section) => (
          <div key={`lane-section-${section.key}`}>
            <input type="hidden" name={`laneSectionTitle_${section.key}`} value={section.title} readOnly />
            <input type="hidden" name={`laneSectionPrompt_${section.key}`} value={section.prompt} readOnly />
            <input type="hidden" name={`laneSectionValue_${section.key}`} value={section.value} readOnly />
          </div>
        ))}
      </>
    );
  }

  const railItems = projectCoachStepOrder.map((stepId, index) => ({
    id: stepId,
    title: steps[stepId].title,
    shortTitle: steps[stepId].shortTitle,
    status: assessment.steps[stepId].status,
    current: currentStepId === stepId,
    disabled: index > currentStepIndex && !assessment.steps[stepId].complete
  }));

  function renderCurrentStep() {
    switch (currentStepId) {
      case "lane":
        return (
          <ProjectStepLane
            step={currentStep}
            evaluation={currentStepEvaluation}
            warningItems={carryForwardWarnings}
            laneEvaluation={assessment.fields.lanePrimary}
            projectTypeEvaluation={assessment.fields.projectType}
            laneTagsEvaluation={assessment.fields.laneTags}
            lanePrimary={values.lanePrimary}
            projectType={values.projectType}
            laneTags={values.laneTags}
            currentOutputLabel={currentOutputLabel}
            laneTemplate={laneTemplate}
            onChangeLane={changeLane}
            onChangeProjectType={changeProjectType}
            onToggleLaneTag={toggleLaneTag}
          />
        );
      case "context":
        return (
          <ProjectStepContext
            step={currentStep}
            evaluation={currentStepEvaluation}
            warningItems={carryForwardWarnings}
            issueEvaluation={assessment.fields.issueIds}
            teamEvaluation={assessment.fields.teamId}
            proposalEvaluation={assessment.fields.supportingProposalId}
            collaboratorEvaluation={assessment.fields.collaboratorIds}
            issues={issues}
            teams={teams}
            proposals={proposals}
            users={users}
            viewerId={viewerId}
            issueIds={values.issueIds}
            teamId={values.teamId}
            supportingProposalId={values.supportingProposalId}
            collaboratorIds={values.collaboratorIds}
            onToggleIssue={(value) => toggleArrayValue("issueIds", value)}
            onChangeTeam={(value) => updateField("teamId", value)}
            onChangeSupportingProposal={(value) => updateField("supportingProposalId", value)}
            onToggleCollaborator={(value) => toggleArrayValue("collaboratorIds", value)}
          />
        );
      case "opening":
        return (
          <ProjectStepOpening
            step={currentStep}
            evaluation={currentStepEvaluation}
            warningItems={carryForwardWarnings}
            titleEvaluation={assessment.fields.title}
            summaryEvaluation={assessment.fields.summary}
            abstractEvaluation={assessment.fields.abstract}
            title={values.title}
            summary={values.summary}
            abstract={values.abstract}
            onChangeTitle={(value) => updateField("title", value)}
            onChangeSummary={(value) => updateField("summary", value)}
            onChangeAbstract={(value) => updateField("abstract", value)}
            onUseTitleStarter={(starter) => insertStarter("title", starter)}
            onUseSummaryStarter={(starter) => insertStarter("summary", starter)}
            onUseAbstractStarter={(starter) => insertStarter("abstract", starter)}
          />
        );
      case "mission":
        return (
          <ProjectStepMission
            step={currentStep}
            evaluation={currentStepEvaluation}
            warningItems={carryForwardWarnings}
            questionEvaluation={assessment.fields.essentialQuestion}
            methodsEvaluation={assessment.fields.methodsSummary}
            essentialQuestion={values.essentialQuestion}
            methodsSummary={values.methodsSummary}
            onChangeQuestion={(value) => updateField("essentialQuestion", value)}
            onChangeMethods={(value) => updateField("methodsSummary", value)}
            onUseQuestionStarter={(starter) => insertStarter("essentialQuestion", starter)}
            onUseMethodsStarter={(starter) => insertStarter("methodsSummary", starter)}
          />
        );
      case "body":
        return (
          <ProjectStepBody
            step={currentStep}
            evaluation={currentStepEvaluation}
            warningItems={carryForwardWarnings}
            overviewEvaluation={assessment.fields.overview}
            contextEvaluation={assessment.fields.context}
            evidenceEvaluation={assessment.fields.evidence}
            analysisEvaluation={assessment.fields.analysis}
            recommendationEvaluation={assessment.fields.recommendations}
            overviewLabel={laneTemplate.overviewLabel}
            overview={values.overview}
            context={values.context}
            evidence={values.evidence}
            analysis={values.analysis}
            recommendations={values.recommendations}
            onChangeOverview={(value) => updateField("overview", value)}
            onChangeContext={(value) => updateField("context", value)}
            onChangeEvidence={(value) => updateField("evidence", value)}
            onChangeAnalysis={(value) => updateField("analysis", value)}
            onChangeRecommendations={(value) => updateField("recommendations", value)}
            onUseOverviewStarter={(starter) => insertStarter("overview", starter)}
            onUseContextStarter={(starter) => insertStarter("context", starter)}
            onUseEvidenceStarter={(starter) => insertStarter("evidence", starter)}
            onUseAnalysisStarter={(starter) => insertStarter("analysis", starter)}
            onUseRecommendationStarter={(starter) => insertStarter("recommendations", starter)}
          />
        );
      case "laneSections":
        return (
          <ProjectStepLaneSections
            step={currentStep}
            evaluation={currentStepEvaluation}
            warningItems={carryForwardWarnings}
            laneSectionsEvaluation={assessment.fields.laneSections}
            sectionEvaluations={assessment.laneSectionEvaluations}
            laneSections={values.laneSections}
            outputLabel={laneTemplate.outputLabel}
            onChangeSection={updateLaneSection}
            onUseSectionStarter={(key, starter) => insertStarter(`laneSection:${key}`, starter)}
          />
        );
      case "publish":
        return (
          <ProjectStepPublish
            step={currentStep}
            evaluation={currentStepEvaluation}
            warningItems={carryForwardWarnings}
            artifactEvaluation={assessment.fields.artifactLinks}
            referencesEvaluation={assessment.fields.references}
            keywordsEvaluation={assessment.fields.keywords}
            takeawaysEvaluation={assessment.fields.keyTakeaways}
            slugEvaluation={assessment.fields.publicationSlug}
            reflectionEvaluation={assessment.fields.reflection}
            artifactLinks={values.artifactLinks}
            references={values.references}
            keywords={values.keywords}
            keyTakeaways={values.keyTakeaways}
            publicationSlug={values.publicationSlug}
            reflection={values.reflection}
            onChangeArtifactLinks={(value) => updateField("artifactLinks", value)}
            onChangeReferences={(value) => updateField("references", value)}
            onChangeKeywords={(value) => updateField("keywords", value)}
            onChangeTakeaways={(value) => updateField("keyTakeaways", value)}
            onChangeSlug={(value) => updateField("publicationSlug", value)}
            onChangeReflection={(value) => updateField("reflection", value)}
            onUseArtifactStarter={(starter) => insertStarter("artifactLinks", starter)}
            onUseReferencesStarter={(starter) => insertStarter("references", starter)}
            onUseKeywordsStarter={(starter) => insertStarter("keywords", starter)}
            onUseTakeawayStarter={(starter) => insertStarter("keyTakeaways", starter)}
            onUseSlugStarter={(starter) => insertStarter("publicationSlug", starter)}
            onUseReflectionStarter={(starter) => insertStarter("reflection", starter)}
          />
        );
      case "review":
        return (
          <ProjectStepReview
            step={currentStep}
            evaluation={currentStepEvaluation}
            warningItems={carryForwardWarnings}
            findingsEvaluation={assessment.fields.findingsMd}
            findingsMd={values.findingsMd}
            blockers={assessment.reviewBuckets.blockers}
            polish={assessment.reviewBuckets.polish}
            strengths={assessment.reviewBuckets.strengths}
            laneTemplate={laneTemplate}
            onChangeFindings={(value) => updateField("findingsMd", value)}
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
        progressTitle="Adaptive project coach"
        progressDescription={`This coach now works across all four lanes. It changes the guidance, section prompts, and final review standards to match the kind of publication you are building in ${laneTagLabels[values.lanePrimary]}.`}
        autosaveMessage={autosaveState.message}
        autosaveTone={autosaveState.tone}
        completedSteps={completedSteps}
        totalSteps={projectCoachStepOrder.length}
        currentStepName={currentStep.shortTitle}
        rail={<WizardStepRail items={railItems} onSelect={selectFromRail} />}
        footer={
          <WizardFooter
            currentStepNumber={currentStepIndex + 1}
            totalSteps={projectCoachStepOrder.length}
            nextMove={currentStepEvaluation.nextMove}
            canGoBack={currentStepIndex > 0}
            canGoNext={currentStepIndex < projectCoachStepOrder.length - 1}
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
