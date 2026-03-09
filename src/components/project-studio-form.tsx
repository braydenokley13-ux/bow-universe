"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  beginnerProjectStepOrder,
  beginnerStepHasAnyContent,
  buildBeginnerDerivedFields,
  getBeginnerStepIdForField,
  getFirstIncompleteBeginnerStep,
  isBeginnerStepComplete,
  type BeginnerProjectStepId
} from "@/lib/beginner-project";
import {
  getLaneTemplate,
  getPublicationDisplayLabel,
  projectTypeToPublicationType
} from "@/lib/publications";
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
  type ArtifactLink,
  type LaneSectionEntry,
  type LaneTag,
  type ReferenceEntry
} from "@/lib/types";
import { getProjectRepairTarget, getProjectTypeForLane } from "@/lib/student-flow";

type ProjectStudioFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  viewerId: string;
  viewerRole: "STUDENT" | "ADMIN";
  issues: Array<{ id: string; title: string; description: string; severity: number }>;
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
    issueId: string;
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
  beginnerMode?: boolean;
  repairItems?: Array<{
    id: string;
    sectionKey: string;
    body: string;
    createdBy: { name: string } | string;
  }>;
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

  formData.set("issueId", values.issueId);

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

function resolveBeginnerStep(stepParam: string | null, fallback: BeginnerProjectStepId) {
  return beginnerProjectStepOrder.includes(stepParam as BeginnerProjectStepId)
    ? (stepParam as BeginnerProjectStepId)
    : fallback;
}

function uniqueLaneTags(values: LaneTag[], lanePrimary: LaneTag) {
  return Array.from(new Set([...values, lanePrimary])) as LaneTag[];
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

export function ProjectStudioForm({
  action,
  viewerId,
  viewerRole,
  issues,
  teams,
  users,
  proposals,
  initial,
  intentLabel,
  beginnerMode = false,
  repairItems = []
}: ProjectStudioFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const autosaveTimerRef = useRef<number | null>(null);
  const stepSyncRef = useRef(false);
  const autosaveReadyRef = useRef(false);
  const currentStepQuery = searchParams.get("step");
  const repairQuery = searchParams.get("repair");
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
      issueId: initial?.issueId ?? "",
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
  const [manualDerivedFields, setManualDerivedFields] = useState({
    summary: Boolean(initial?.summary),
    abstract: Boolean(initial?.abstract),
    methodsSummary: Boolean(initial?.methodsSummary)
  });
  const issueRequired = viewerRole === "STUDENT";
  const selectedIssue = issues.find((issue) => issue.id === values.issueId) ?? null;
  const effectiveValues = useMemo(() => {
    if (!beginnerMode) {
      return values;
    }

    const derivedBeginnerFields = buildBeginnerDerivedFields({
      issueTitle: selectedIssue?.title ?? "this league issue",
      values
    });

    return {
      ...values,
      projectType: getProjectTypeForLane(values.lanePrimary),
      summary: manualDerivedFields.summary ? values.summary : derivedBeginnerFields.summary,
      abstract: manualDerivedFields.abstract ? values.abstract : derivedBeginnerFields.abstract,
      methodsSummary: manualDerivedFields.methodsSummary
        ? values.methodsSummary
        : derivedBeginnerFields.methodsSummary,
      overview: derivedBeginnerFields.overview,
      laneSections: derivedBeginnerFields.laneSections,
      findingsMd: derivedBeginnerFields.findingsMd
    };
  }, [beginnerMode, manualDerivedFields, selectedIssue?.title, values]);
  const steps = getProjectCoachSteps(effectiveValues.lanePrimary, {
    issueRequired
  });
  const laneTemplate = getLaneTemplate(effectiveValues.lanePrimary);
  const assessment = assessProjectCoach(effectiveValues, {
    issueRequired
  });
  const repairTarget =
    repairQuery?.trim().length
      ? getProjectRepairTarget(repairQuery)
      : repairItems[0]
        ? getProjectRepairTarget(repairItems[0].sectionKey)
        : null;
  const [currentStepId, setCurrentStepId] = useState<ProjectCoachStepId>(() =>
    resolveStep(
      currentStepQuery,
      repairTarget ? (assessment.fields[repairTarget.fieldId].stepId as ProjectCoachStepId) : assessment.firstIncompleteStepId
    )
  );
  const [currentBeginnerStepId, setCurrentBeginnerStepId] = useState<BeginnerProjectStepId>(() =>
    resolveBeginnerStep(
      currentStepQuery,
      repairTarget ? getBeginnerStepIdForField(repairTarget.fieldId) : getFirstIncompleteBeginnerStep(effectiveValues)
    )
  );

  const currentStepIndex = projectCoachStepOrder.indexOf(currentStepId);
  const currentStep = steps[currentStepId];
  const currentStepEvaluation = assessment.steps[currentStepId];
  const currentOutputLabel = getPublicationDisplayLabel({
    publicationType: projectTypeToPublicationType(effectiveValues.projectType, effectiveValues.lanePrimary),
    lanePrimary: effectiveValues.lanePrimary
  });
  const completedSteps = projectCoachStepOrder.filter((stepId) => {
    const status = assessment.steps[stepId].status;
    return status === "strong" || status === "done";
  }).length;
  const currentBeginnerStepIndex = beginnerProjectStepOrder.indexOf(currentBeginnerStepId);
  const completedBeginnerSteps = beginnerProjectStepOrder.filter((stepId) =>
    isBeginnerStepComplete(stepId, effectiveValues)
  ).length;
  const beginnerSubmitReady =
    effectiveValues.issueId.trim().length > 0 &&
    effectiveValues.essentialQuestion.trim().length >= 8 &&
    effectiveValues.context.trim().length >= 16 &&
    effectiveValues.evidence.trim().length >= 16 &&
    effectiveValues.analysis.trim().length >= 16 &&
    effectiveValues.recommendations.trim().length >= 12 &&
    effectiveValues.title.trim().length >= 12 &&
    effectiveValues.references.trim().length > 0;

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (beginnerMode) {
      return;
    }

    if (!stepSyncRef.current) {
      stepSyncRef.current = true;
      setCurrentStepId(
        resolveStep(
          currentStepQuery,
          repairTarget
            ? (assessment.fields[repairTarget.fieldId].stepId as ProjectCoachStepId)
            : assessment.firstIncompleteStepId
        )
      );
      return;
    }

    const resolvedStep = resolveStep(
      currentStepQuery,
      repairTarget
        ? (assessment.fields[repairTarget.fieldId].stepId as ProjectCoachStepId)
        : assessment.firstIncompleteStepId
    );

    if (resolvedStep !== currentStepId) {
      setCurrentStepId(resolvedStep);
    }
  }, [assessment, assessment.firstIncompleteStepId, beginnerMode, currentStepId, currentStepQuery, repairTarget]);

  useEffect(() => {
    if (beginnerMode) {
      return;
    }

    replaceStepUrl(pathname, searchParams.toString(), currentStepId);
  }, [beginnerMode, currentStepId, pathname, searchParams]);

  useEffect(() => {
    if (!beginnerMode) {
      return;
    }

    if (!stepSyncRef.current) {
      stepSyncRef.current = true;
      setCurrentBeginnerStepId(
        resolveBeginnerStep(
          currentStepQuery,
          repairTarget
            ? getBeginnerStepIdForField(repairTarget.fieldId)
            : getFirstIncompleteBeginnerStep(effectiveValues)
        )
      );
      return;
    }

    const resolvedStep = resolveBeginnerStep(
      currentStepQuery,
      repairTarget
        ? getBeginnerStepIdForField(repairTarget.fieldId)
        : getFirstIncompleteBeginnerStep(effectiveValues)
    );

    if (resolvedStep !== currentBeginnerStepId) {
      setCurrentBeginnerStepId(resolvedStep);
    }
  }, [beginnerMode, currentBeginnerStepId, currentStepQuery, effectiveValues, repairTarget]);

  useEffect(() => {
    if (!beginnerMode) {
      return;
    }

    replaceStepUrl(pathname, searchParams.toString(), currentBeginnerStepId);
  }, [beginnerMode, currentBeginnerStepId, pathname, searchParams]);

  useEffect(() => {
    if (beginnerMode || !repairTarget) {
      return;
    }

    const targetStepId = assessment.fields[repairTarget.fieldId].stepId as ProjectCoachStepId;
    if (targetStepId !== currentStepId) {
      setCurrentStepId(targetStepId);
      return;
    }

    window.setTimeout(() => {
      const element = document.getElementById(getProjectCoachDomId(repairTarget.fieldId));
      element?.focus();
    }, 40);
  }, [assessment, beginnerMode, currentStepId, repairTarget]);

  const performAutosave = useCallback(async () => {
    if (!hasAnyDraftContent(effectiveValues) && !draftId) {
      return;
    }

    setAutosaveState({
      tone: "saving",
      message: "Saving draft..."
    });

    try {
      const response = await fetch("/api/studio/project-autosave", {
        method: "POST",
        body: buildProjectFormData(effectiveValues, draftId)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Autosave failed.");
      }

      if (result.id && result.id !== draftId) {
        setDraftId(result.id);
        if (!initial?.id && result.editUrl) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("step", beginnerMode ? currentBeginnerStepId : currentStepId);
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
  }, [
    beginnerMode,
    currentBeginnerStepId,
    currentStepId,
    draftId,
    effectiveValues,
    initial?.id,
    router,
    searchParams
  ]);

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
    if (beginnerMode && (fieldId === "summary" || fieldId === "abstract" || fieldId === "methodsSummary")) {
      setManualDerivedFields((current) => ({
        ...current,
        [fieldId]: true
      }));
    }

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
        projectType: beginnerMode ? getProjectTypeForLane(nextLane) : currentValues.projectType,
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

  function changeIssue(issueId: string) {
    setValues((current) => ({
      ...current,
      issueId
    }));
  }

  function toggleArrayValue(fieldId: "collaboratorIds", value: string) {
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

  function jumpToIssueStep() {
    setCarryForwardWarnings([]);

    if (beginnerMode) {
      setCurrentBeginnerStepId("issue");
    } else {
      setCurrentStepId("context");
    }

    window.setTimeout(() => {
      const element = document.getElementById(getProjectCoachDomId("issueId"));
      element?.focus();
    }, 30);
  }

  function renderHiddenFields() {
    return (
      <>
        <input type="hidden" name="projectId" value={draftId} readOnly />
        <input type="hidden" name="title" value={effectiveValues.title} readOnly />
        <input type="hidden" name="summary" value={effectiveValues.summary} readOnly />
        <input type="hidden" name="abstract" value={effectiveValues.abstract} readOnly />
        <input type="hidden" name="essentialQuestion" value={effectiveValues.essentialQuestion} readOnly />
        <input type="hidden" name="methodsSummary" value={effectiveValues.methodsSummary} readOnly />
        <input type="hidden" name="projectType" value={effectiveValues.projectType} readOnly />
        <input type="hidden" name="lanePrimary" value={effectiveValues.lanePrimary} readOnly />
        <input type="hidden" name="beginnerMode" value={beginnerMode ? "1" : "0"} readOnly />
        <input type="hidden" name="teamId" value={effectiveValues.teamId} readOnly />
        <input type="hidden" name="supportingProposalId" value={effectiveValues.supportingProposalId} readOnly />
        <input type="hidden" name="artifactLinks" value={effectiveValues.artifactLinks} readOnly />
        <input type="hidden" name="references" value={effectiveValues.references} readOnly />
        <input type="hidden" name="keywords" value={effectiveValues.keywords} readOnly />
        <input type="hidden" name="keyTakeaways" value={effectiveValues.keyTakeaways} readOnly />
        <input type="hidden" name="publicationSlug" value={effectiveValues.publicationSlug} readOnly />
        <input type="hidden" name="findingsMd" value={effectiveValues.findingsMd} readOnly />
        <input type="hidden" name="overview" value={effectiveValues.overview} readOnly />
        <input type="hidden" name="context" value={effectiveValues.context} readOnly />
        <input type="hidden" name="evidence" value={effectiveValues.evidence} readOnly />
        <input type="hidden" name="analysis" value={effectiveValues.analysis} readOnly />
        <input type="hidden" name="recommendations" value={effectiveValues.recommendations} readOnly />
        <input type="hidden" name="reflection" value={effectiveValues.reflection} readOnly />
        <input
          type="hidden"
          name="laneSectionKeys"
          value={effectiveValues.laneSections.map((section) => section.key).join(",")}
          readOnly
        />

        {effectiveValues.laneTags.map((laneTag) => (
          <input key={`lane-tag-${laneTag}`} type="hidden" name="laneTags" value={laneTag} readOnly />
        ))}
        <input type="hidden" name="issueId" value={effectiveValues.issueId} readOnly />
        {effectiveValues.collaboratorIds.map((collaboratorId) => (
          <input
            key={`collaborator-${collaboratorId}`}
            type="hidden"
            name="collaboratorIds"
            value={collaboratorId}
            readOnly
          />
        ))}
        {effectiveValues.laneSections.map((section) => (
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
            issueEvaluation={assessment.fields.issueId}
            teamEvaluation={assessment.fields.teamId}
            proposalEvaluation={assessment.fields.supportingProposalId}
            collaboratorEvaluation={assessment.fields.collaboratorIds}
            issues={issues}
            teams={teams}
            proposals={proposals}
            users={users}
            viewerId={viewerId}
            issueId={values.issueId}
            teamId={values.teamId}
            supportingProposalId={values.supportingProposalId}
            collaboratorIds={values.collaboratorIds}
            onChangeIssue={changeIssue}
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

  const beginnerStepContent = {
    issue: {
      title: "Choose issue",
      shortTitle: "Issue",
      rightNow: "Pick the single issue this project will help with.",
      whyItMatters:
        "A real issue removes the blank-page problem and gives every later answer a clear anchor.",
      nextMove: selectedIssue ? "Keep this issue and move to lane choice." : "Pick one issue card to continue.",
      strongExample:
        "Strong issue choice: one live problem with clear pressure and a reason a student can explain in one sentence.",
      sentenceStarter: "I want to study this issue because...",
      celebrationNote: "Nice. Your project has a real job now."
    },
    lane: {
      title: "Choose lane",
      shortTitle: "Lane",
      rightNow: "Pick the lane that best matches the kind of help this issue needs.",
      whyItMatters:
        "The lane changes the shape of the final publication and keeps the project from drifting.",
      nextMove: "Choose the lane that makes your next action the clearest.",
      strongExample:
        "Strong lane choice: investigators explain a pattern, operators make a plan, tool builders make a helper, reform architects support a policy change.",
      sentenceStarter: "This lane fits best because...",
      celebrationNote: "Good choice. You know what kind of work you are making."
    },
    question: {
      title: "Big question",
      shortTitle: "Question",
      rightNow: "Write the one big question the project is trying to answer.",
      whyItMatters: "A clear question keeps the evidence and recommendations from scattering.",
      nextMove: "Write one question that starts with how, why, what, or which.",
      strongExample:
        "Strong question: How does this issue change the choices teams can make over the next two seasons?",
      sentenceStarter: "How does this issue affect...",
      celebrationNote: "Good. The project now has one big question to answer."
    },
    context: {
      title: "Why it matters",
      shortTitle: "Context",
      rightNow: "Explain the pressure and why a reader should care right now.",
      whyItMatters:
        "This is the section that convinces a reader the issue is real and worth attention.",
      nextMove: "Name who is affected, what is getting harder, and why the pressure matters now.",
      strongExample:
        "Strong context: The new cap pressure hits mid-tier teams hardest because it removes the tools they usually use to recover from one bad contract.",
      sentenceStarter: "This matters now because...",
      celebrationNote: "Good. A new reader can now tell why this issue matters."
    },
    evidence: {
      title: "Add evidence",
      shortTitle: "Evidence",
      rightNow: "List the facts, examples, numbers, or notes that support the project.",
      whyItMatters: "Without evidence, the project feels like a guess instead of research.",
      nextMove: "Add the clearest example first, then the next supporting detail.",
      strongExample:
        "Strong evidence: team examples, payroll comparisons, issue notes, or a rule reference that directly supports the claim.",
      sentenceStarter: "One piece of evidence that helps is...",
      celebrationNote: "Nice. You have real support instead of only an opinion."
    },
    analysis: {
      title: "What it means",
      shortTitle: "Meaning",
      rightNow: "Explain what the evidence changes or reveals.",
      whyItMatters: "Analysis is where you turn raw notes into a useful idea.",
      nextMove: "Tell the reader what pattern the evidence points to and why it matters.",
      strongExample:
        "Strong analysis: The evidence shows the pressure is really about timing, not only payroll size, because teams lose flexibility before they lose spending intent.",
      sentenceStarter: "This evidence shows that...",
      celebrationNote: "Nice. You turned raw notes into an idea a reader can follow."
    },
    recommendations: {
      title: "Next step",
      shortTitle: "Next step",
      rightNow: "End with the clearest next move your evidence supports.",
      whyItMatters:
        "Good projects do not stop at explanation. They point to action, testing, or decision-making.",
      nextMove: "Write one action, decision, or next question the league should take seriously.",
      strongExample:
        "Strong next step: test a narrower adjustment first so the league can reduce pressure without removing every planning tool at once.",
      sentenceStarter: "The clearest next step is...",
      celebrationNote: "Good. Your project ends with a clear next move."
    },
    title: {
      title: "Working title",
      shortTitle: "Title",
      rightNow: "Give the project a plain-language title that matches the question.",
      whyItMatters: "A simple title helps the draft feel real and easier to return to later.",
      nextMove: "Write a title that says what the project studies and where the pressure is.",
      strongExample: "Strong title: How the second apron changes small-market planning.",
      sentenceStarter: "How ... changes ...",
      celebrationNote: "Great. The draft now has a title you can find later."
    },
    references: {
      title: "Sources",
      shortTitle: "Sources",
      rightNow: "Add the source list so the evidence can be checked.",
      whyItMatters:
        "Sources make the project usable by other students, reviewers, and future teams.",
      nextMove: "Add at least one source line in the requested format.",
      strongExample:
        "Strong source line: Team payroll sheet | https://example.com | DATASET | Shows the spending change.",
      sentenceStarter: "Source name | https://... | DATASET | This source helps because...",
      celebrationNote: "Good. Another reader can now check where your evidence came from."
    },
    review: {
      title: "Final check",
      shortTitle: "Review",
      rightNow: "Read the draft once as a reader, not the writer.",
      whyItMatters: "This is where small fixes make the project feel ready instead of rushed.",
      nextMove: beginnerSubmitReady
        ? "Submit when the draft reads clearly from question to next step."
        : "Fix the missing pieces listed here, then submit.",
      strongExample:
        "Strong final check: the issue, question, evidence, meaning, and next step all connect without extra explanation.",
      sentenceStarter: "I checked that my question, evidence, and next step all match.",
      celebrationNote: "Nice work. This first project is ready for the next classroom step."
    }
  } satisfies Record<
    BeginnerProjectStepId,
    {
      title: string;
      shortTitle: string;
      rightNow: string;
      whyItMatters: string;
      nextMove: string;
      strongExample: string;
      sentenceStarter: string;
      celebrationNote: string;
    }
  >;

  const beginnerRailItems = beginnerProjectStepOrder.map((stepId, index) => {
    const isComplete = isBeginnerStepComplete(stepId, effectiveValues);
    const hasContent = beginnerStepHasAnyContent(stepId, effectiveValues);

    return {
      id: stepId,
      title: beginnerStepContent[stepId].title,
      shortTitle: beginnerStepContent[stepId].shortTitle,
      status: isComplete ? "done" : hasContent ? "needs_work" : "not_started",
      current: currentBeginnerStepId === stepId,
      disabled: index > currentBeginnerStepIndex && !isComplete
    } as const;
  });

  function goBackBeginner() {
    if (currentBeginnerStepIndex <= 0) {
      return;
    }

    setCurrentBeginnerStepId(beginnerProjectStepOrder[currentBeginnerStepIndex - 1]);
  }

  function goNextBeginner() {
    const nextStepId = beginnerProjectStepOrder[currentBeginnerStepIndex + 1];
    if (!nextStepId) {
      return;
    }

    setCurrentBeginnerStepId(nextStepId);
  }

  function selectBeginnerStep(stepId: BeginnerProjectStepId) {
    const targetIndex = beginnerProjectStepOrder.indexOf(stepId);
    if (targetIndex > currentBeginnerStepIndex && !isBeginnerStepComplete(stepId, effectiveValues)) {
      return;
    }

    setCurrentBeginnerStepId(stepId);
  }

  function renderBeginnerRepairCard() {
    const item = repairItems[0];

    if (!item || !repairTarget) {
      return null;
    }

    const createdByName = typeof item.createdBy === "string" ? item.createdBy : item.createdBy.name;
    const targetStepId = getBeginnerStepIdForField(repairTarget.fieldId);

    return (
      <article className="rounded-[28px] border border-warn/30 bg-warn/10 p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-warn">Repair queue</p>
            <h3 className="mt-3 font-display text-2xl text-ink">Fix one thing first</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/72">
              {createdByName} asked for a stronger {repairTarget.label}. Stay on this one repair until it is clearer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => selectBeginnerStep(targetStepId)}
            className="rounded-full border border-warn bg-warn px-4 py-2 text-sm font-medium text-white"
          >
            Fix this now
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-warn/25 bg-white/80 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-warn">Feedback</p>
            <p className="mt-3 text-sm leading-6 text-ink/72">{item.body}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white/75 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Checklist</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
              <li className="rounded-2xl border border-line bg-mist/40 px-3 py-2">
                Re-read the feedback and restate the point in your own words.
              </li>
              <li className="rounded-2xl border border-line bg-mist/40 px-3 py-2">
                Add one clearer sentence or one better piece of evidence.
              </li>
              <li className="rounded-2xl border border-line bg-mist/40 px-3 py-2">
                Make sure the section answers the exact question being asked.
              </li>
            </ul>
          </div>
        </div>
      </article>
    );
  }

  function renderBeginnerStep() {
    const fullStudioHref = draftId ? `/projects/${draftId}/edit?studio=full` : `${pathname}?studio=full`;

    switch (currentBeginnerStepId) {
      case "issue":
        return (
          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 1</p>
            <h3 className="mt-3 font-display text-3xl text-ink">Pick one real issue</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              Start with a real league problem so you never have to invent a topic from nothing.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {issues.map((issue) => {
                const selected = effectiveValues.issueId === issue.id;
                return (
                  <button
                    key={issue.id}
                    id={
                      selected || (!effectiveValues.issueId && issues[0]?.id === issue.id)
                        ? getProjectCoachDomId("issueId")
                        : undefined
                    }
                    type="button"
                    onClick={() => changeIssue(issue.id)}
                    className={`rounded-[24px] border p-5 text-left transition ${
                      selected
                        ? "border-accent bg-accent/8 shadow-panel"
                        : "border-line bg-white/70 hover:border-accent/45"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
                        Severity {issue.severity}
                      </span>
                      {selected ? (
                        <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-success">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-base font-semibold text-ink">{issue.title}</p>
                    <p className="mt-3 text-sm leading-6 text-ink/62">
                      {issue.description.trim() || "Choose the issue that feels clear enough to explain to someone else."}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedIssue ? (
              <div className="mt-6 rounded-2xl border border-success/25 bg-success/10 p-4 text-sm leading-6 text-ink/72">
                You are building around <span className="font-semibold text-ink">{selectedIssue.title}</span>.
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-line px-4 py-5 text-sm leading-6 text-ink/60">
                Pick one issue to unlock the rest of the guided questions.
              </div>
            )}
          </article>
        );
      case "lane":
        return (
          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 2</p>
            <h3 className="mt-3 font-display text-3xl text-ink">Choose the lane that fits the job</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              You can change this. The best first lane is the one that makes your next move obvious.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {(
                [
                  "STRATEGIC_OPERATORS",
                  "ECONOMIC_INVESTIGATORS",
                  "TOOL_BUILDERS",
                  "POLICY_REFORM_ARCHITECTS"
                ] as LaneTag[]
              ).map((lane) => {
                const selected = effectiveValues.lanePrimary === lane;
                return (
                  <button
                    key={lane}
                    type="button"
                    onClick={() => changeLane(lane)}
                    className={`rounded-[24px] border p-5 text-left transition ${
                      selected
                        ? "border-accent bg-accent/8 shadow-panel"
                        : "border-line bg-white/70 hover:border-accent/45"
                    }`}
                  >
                    <p className="font-medium text-ink">{laneTagLabels[lane]}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/65">
                      {lane === "STRATEGIC_OPERATORS"
                        ? "Build a plan for a team or operator."
                        : lane === "ECONOMIC_INVESTIGATORS"
                          ? "Explain the pattern, pressure, or tradeoff."
                          : lane === "TOOL_BUILDERS"
                            ? "Make a tool, tracker, or model that helps decision-making."
                            : "Support a reform idea with clear evidence and tradeoffs."}
                    </p>
                    {selected ? (
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                        Current lane
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </article>
        );
      case "question":
        return (
          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 3</p>
            <h3 className="mt-3 font-display text-3xl text-ink">What big question are you trying to answer?</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              Write one question. A reader should know what you are studying after one sentence.
            </p>
            <textarea
              id={getProjectCoachDomId("essentialQuestion")}
              value={values.essentialQuestion}
              onChange={(event) => updateField("essentialQuestion", event.target.value)}
              placeholder="Example: How is this issue changing the choices teams can make?"
              className="mt-6 min-h-[180px] w-full rounded-[24px] border border-line bg-white/80 px-4 py-4 text-base text-ink outline-none transition focus:border-accent"
            />
          </article>
        );
      case "context":
        return (
          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 4</p>
            <h3 className="mt-3 font-display text-3xl text-ink">Why does this issue matter right now?</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              Explain the pressure in plain language. Pretend you are talking to a smart classmate who missed one day.
            </p>
            <textarea
              id={getProjectCoachDomId("context")}
              value={values.context}
              onChange={(event) => updateField("context", event.target.value)}
              placeholder="Explain the pressure, who it affects, and why it is not a small detail."
              className="mt-6 min-h-[220px] w-full rounded-[24px] border border-line bg-white/80 px-4 py-4 text-base text-ink outline-none transition focus:border-accent"
            />
          </article>
        );
      case "evidence":
        return (
          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 5</p>
            <h3 className="mt-3 font-display text-3xl text-ink">What evidence do you have?</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              Add the facts, examples, notes, numbers, or comparisons that support the project.
            </p>
            <textarea
              id={getProjectCoachDomId("evidence")}
              value={values.evidence}
              onChange={(event) => updateField("evidence", event.target.value)}
              placeholder="List the clearest evidence you have so far."
              className="mt-6 min-h-[220px] w-full rounded-[24px] border border-line bg-white/80 px-4 py-4 text-base text-ink outline-none transition focus:border-accent"
            />
          </article>
        );
      case "analysis":
        return (
          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 6</p>
            <h3 className="mt-3 font-display text-3xl text-ink">What does the evidence mean?</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              Do not just repeat the evidence. Explain the pattern or idea it points to.
            </p>
            <textarea
              id={getProjectCoachDomId("analysis")}
              value={values.analysis}
              onChange={(event) => updateField("analysis", event.target.value)}
              placeholder="Tell the reader what the evidence changes, proves, or reveals."
              className="mt-6 min-h-[220px] w-full rounded-[24px] border border-line bg-white/80 px-4 py-4 text-base text-ink outline-none transition focus:border-accent"
            />
          </article>
        );
      case "recommendations":
        return (
          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 7</p>
            <h3 className="mt-3 font-display text-3xl text-ink">What should happen next?</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              End with an action, next test, or decision. Give the reader somewhere to go next.
            </p>
            <textarea
              id={getProjectCoachDomId("recommendations")}
              value={values.recommendations}
              onChange={(event) => updateField("recommendations", event.target.value)}
              placeholder="Write the clearest next step your evidence supports."
              className="mt-6 min-h-[220px] w-full rounded-[24px] border border-line bg-white/80 px-4 py-4 text-base text-ink outline-none transition focus:border-accent"
            />
          </article>
        );
      case "title":
        return (
          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 8</p>
            <h3 className="mt-3 font-display text-3xl text-ink">Give the project a working title</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              This does not need to be perfect. It only needs to tell a reader what the project is about.
            </p>
            <input
              id={getProjectCoachDomId("title")}
              value={values.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Example: How the second apron changes small-market planning"
              className="mt-6 w-full rounded-[24px] border border-line bg-white/80 px-4 py-4 text-base text-ink outline-none transition focus:border-accent"
            />

            <div className="mt-6 rounded-[24px] border border-line bg-white/75 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                Auto-built summary preview
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/72">
                {effectiveValues.summary || "Your summary will appear here as you answer the guided questions."}
              </p>
            </div>
          </article>
        );
      case "references":
        return (
          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 9</p>
            <h3 className="mt-3 font-display text-3xl text-ink">Add your sources</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              Put one source on each line using this format:{" "}
              <span className="font-mono text-xs">Label | URL | TYPE | note</span>
            </p>
            <textarea
              id={getProjectCoachDomId("references")}
              value={values.references}
              onChange={(event) => updateField("references", event.target.value)}
              placeholder={
                "League memo | https://example.com | ARTICLE | Explains the rule\nTeam payroll sheet | https://example.com | DATASET | Gives the numbers"
              }
              className="mt-6 min-h-[220px] w-full rounded-[24px] border border-line bg-white/80 px-4 py-4 text-base text-ink outline-none transition focus:border-accent"
            />
          </article>
        );
      case "review":
        return (
          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Step 10</p>
            <h3 className="mt-3 font-display text-3xl text-ink">Final check</h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
              Check the flow once from top to bottom. If it reads clearly, you are ready to submit.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-line bg-white/75 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Checklist</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                  <li className="rounded-2xl border border-line bg-mist/40 px-3 py-2">
                    {selectedIssue ? `Issue: ${selectedIssue.title}.` : "Pick one issue."}
                  </li>
                  <li className="rounded-2xl border border-line bg-mist/40 px-3 py-2">
                    {effectiveValues.essentialQuestion.trim() ? "Big question written." : "Write the big question."}
                  </li>
                  <li className="rounded-2xl border border-line bg-mist/40 px-3 py-2">
                    {effectiveValues.references.trim() ? "At least one source added." : "Add at least one source."}
                  </li>
                </ul>
              </div>

              <div className="rounded-[24px] border border-line bg-white/75 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
                  Publication preview
                </p>
                <p className="mt-3 text-sm font-semibold text-ink">
                  {effectiveValues.title || "Working title appears here"}
                </p>
                <p className="mt-3 text-sm leading-6 text-ink/68">
                  {effectiveValues.summary || "Summary preview appears here."}
                </p>
              </div>
            </div>

            <details className="mt-6 rounded-[24px] border border-line bg-white/75 p-5">
              <summary className="cursor-pointer list-none font-medium text-ink">Open final polish drawer</summary>
              <div className="mt-5 space-y-5">
                <div>
                  <label
                    htmlFor={getProjectCoachDomId("summary")}
                    className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent"
                  >
                    Summary
                  </label>
                  <textarea
                    id={getProjectCoachDomId("summary")}
                    value={effectiveValues.summary}
                    onChange={(event) => updateField("summary", event.target.value)}
                    className="mt-2 min-h-[140px] w-full rounded-[20px] border border-line bg-white/85 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
                  />
                </div>
                <div>
                  <label
                    htmlFor={getProjectCoachDomId("abstract")}
                    className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent"
                  >
                    Abstract
                  </label>
                  <textarea
                    id={getProjectCoachDomId("abstract")}
                    value={effectiveValues.abstract}
                    onChange={(event) => updateField("abstract", event.target.value)}
                    className="mt-2 min-h-[180px] w-full rounded-[20px] border border-line bg-white/85 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
                  />
                </div>
                <div>
                  <label
                    htmlFor={getProjectCoachDomId("methodsSummary")}
                    className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent"
                  >
                    Methods summary
                  </label>
                  <textarea
                    id={getProjectCoachDomId("methodsSummary")}
                    value={effectiveValues.methodsSummary}
                    onChange={(event) => updateField("methodsSummary", event.target.value)}
                    className="mt-2 min-h-[120px] w-full rounded-[20px] border border-line bg-white/85 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent"
                  />
                </div>
              </div>
            </details>

            <div className="mt-6 rounded-[24px] border border-line bg-mist/45 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Need more control?</p>
              <p className="mt-3 text-sm leading-6 text-ink/68">
                You can switch to the full studio if you want every advanced field.
              </p>
              <Link
                href={fullStudioHref}
                className="mt-4 inline-flex rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
              >
                Open full studio instead
              </Link>
            </div>
          </article>
        );
    }
  }

  const beginnerCurrentContent = beginnerStepContent[currentBeginnerStepId];
  const beginnerMissingItems = (() => {
    switch (currentBeginnerStepId) {
      case "issue":
        return selectedIssue ? [] : ["Pick one issue so the project has a clear job."];
      case "lane":
        return effectiveValues.lanePrimary
          ? []
          : ["Pick the lane that matches the kind of work you want to do."];
      case "question":
        return effectiveValues.essentialQuestion.trim().length >= 8
          ? []
          : ["Write one clear question the project will answer."];
      case "context":
        return effectiveValues.context.trim().length >= 16
          ? []
          : ["Explain who feels the pressure and why it matters now."];
      case "evidence":
        return effectiveValues.evidence.trim().length >= 16
          ? []
          : ["Add the strongest fact, example, or comparison you have."];
      case "analysis":
        return effectiveValues.analysis.trim().length >= 16
          ? []
          : ["Explain what the evidence means instead of repeating it."];
      case "recommendations":
        return effectiveValues.recommendations.trim().length >= 12
          ? []
          : ["End with one clear next step, action, or test."];
      case "title":
        return effectiveValues.title.trim().length >= 12
          ? []
          : ["Write a title that tells a reader what the project studies."];
      case "references":
        return effectiveValues.references.trim().length > 0
          ? []
          : ["Add at least one source line so the evidence can be checked."];
      case "review":
        return beginnerProjectStepOrder
          .filter((stepId) => stepId !== "review" && !isBeginnerStepComplete(stepId, effectiveValues))
          .map((stepId) => `Finish ${beginnerStepContent[stepId].title.toLowerCase()}.`);
    }
  })();
  const reviewMode = beginnerMode ? currentBeginnerStepId === "review" : currentStepId === "review";
  const submitReady = beginnerMode ? beginnerSubmitReady : assessment.submitReady;
  const issueReminder = selectedIssue
    ? `Main issue: ${selectedIssue.title}.`
    : issueRequired
      ? "Pick one issue so the project stays tied to a real league problem."
      : "You can add one main issue if it helps place the project.";
  const issueCard = selectedIssue
    ? {
        title: selectedIssue.title,
        body: selectedIssue.description.trim() || "This is the main issue the project is solving around.",
        severity: selectedIssue.severity,
        actionLabel: beginnerMode ? "Change issue" : "Edit issue choice",
        onAction: jumpToIssueStep
      }
    : issueRequired
      ? {
          title: "No issue chosen yet",
          body: "Pick one issue and keep it visible so each answer stays connected to the same problem.",
          severity: null,
          actionLabel: "Choose issue",
          onAction: jumpToIssueStep
        }
      : null;

  return (
    <form
      action={action}
      className="space-y-6"
      onSubmit={(event) => {
        if (!reviewMode || !submitReady) {
          event.preventDefault();
        }
      }}
    >
      {renderHiddenFields()}

      {beginnerMode ? (
        <WizardShell
          progressTitle="First project guide"
          documentTitle={effectiveValues.title || "Untitled project"}
          progressDescription={`This version keeps the work small and clear. You answer one question at a time, and the studio builds the formal project fields for you in ${laneTagLabels[effectiveValues.lanePrimary]}. ${issueReminder}`}
          autosaveMessage={autosaveState.message}
          autosaveTone={autosaveState.tone}
          completedSteps={completedBeginnerSteps}
          totalSteps={beginnerProjectStepOrder.length}
          currentStepName={beginnerCurrentContent.shortTitle}
          issueCard={issueCard}
          coachPanel={{
            activeLabel: beginnerCurrentContent.title,
            rightNow: beginnerCurrentContent.rightNow,
            whyItMatters: beginnerCurrentContent.whyItMatters,
            nextMove: beginnerCurrentContent.nextMove,
            missingItems: beginnerMissingItems,
            strongExample: beginnerCurrentContent.strongExample,
            sentenceStarter: beginnerCurrentContent.sentenceStarter,
            celebrationNote:
              beginnerMissingItems.length === 0 ? beginnerCurrentContent.celebrationNote : null,
            beginnerMode: true,
            repairLabel: repairTarget?.label ?? null
          }}
          rail={<WizardStepRail items={beginnerRailItems} onSelect={selectBeginnerStep} />}
          footer={
            <WizardFooter
              currentStepNumber={currentBeginnerStepIndex + 1}
              totalSteps={beginnerProjectStepOrder.length}
              nextMove={beginnerCurrentContent.nextMove}
              canGoBack={currentBeginnerStepIndex > 0}
              canGoNext={currentBeginnerStepIndex < beginnerProjectStepOrder.length - 1}
              onSaveDraft={handleManualDraftSave}
              onBack={goBackBeginner}
              onNext={goNextBeginner}
              submitReady={beginnerSubmitReady}
              reviewMode={currentBeginnerStepId === "review"}
              submitLabel={intentLabel}
            />
          }
        >
          {renderBeginnerRepairCard()}
          {renderBeginnerStep()}
        </WizardShell>
      ) : (
        <WizardShell
          progressTitle="Project coach"
          documentTitle={values.title || "Untitled project"}
          progressDescription={`Lane: ${laneTagLabels[values.lanePrimary]}. Complete each section, then submit for review. ${issueReminder}`}
          autosaveMessage={autosaveState.message}
          autosaveTone={autosaveState.tone}
          completedSteps={completedSteps}
          totalSteps={projectCoachStepOrder.length}
          currentStepName={currentStep.shortTitle}
          issueCard={issueCard}
          coachPanel={{
            activeLabel: currentStep.title,
            rightNow: currentStep.rightNow,
            whyItMatters: currentStep.whyItMatters,
            nextMove: currentStepEvaluation.nextMove,
            missingItems: currentStepEvaluation.missingItems,
            strongExample: currentStep.strongExample,
            beginnerMode,
            repairLabel: repairTarget?.label ?? null
          }}
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
      )}
    </form>
  );
}
