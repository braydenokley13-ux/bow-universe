import {
  ProjectType,
  ProposalStatus,
  PublicationSourceType,
  PublicationType,
  SubmissionStatus
} from "@prisma/client";

import type {
  ArtifactLink,
  LaneSectionEntry,
  LaneTag,
  LaneTemplateDefinition,
  ProjectSubmissionContent,
  ProposalNarrative,
  ProposalSubmissionContent,
  PublicationMetadata,
  ReferenceEntry,
  SubmissionChecklistItem
} from "@/lib/types";
import { laneTagLabels, publicationTypeLabels } from "@/lib/types";
import { slugify } from "@/lib/utils";

type ProjectChecklistArgs = {
  title: string;
  abstract: string;
  essentialQuestion: string;
  content: ProjectSubmissionContent;
  references: ReferenceEntry[];
  keywords: string[];
};

type ProposalChecklistArgs = {
  title: string;
  abstract: string;
  content: ProposalSubmissionContent;
  references: ReferenceEntry[];
  keywords: string[];
  sandboxInterpretationSaved: boolean;
};

const projectPublicationTypeByLane: Record<LaneTag, PublicationType> = {
  TOOL_BUILDERS: PublicationType.TOOL_BRIEF,
  POLICY_REFORM_ARCHITECTS: PublicationType.POLICY_MEMO,
  STRATEGIC_OPERATORS: PublicationType.TEAM_STRATEGY_DOSSIER,
  ECONOMIC_INVESTIGATORS: PublicationType.RESEARCH_BRIEF
};

const laneTemplates: Record<LaneTag, LaneTemplateDefinition> = {
  TOOL_BUILDERS: {
    lane: "TOOL_BUILDERS",
    publicationType: PublicationType.TOOL_BRIEF,
    outputLabel: "Tool Brief",
    overviewLabel: "Tool purpose",
    steps: [
      "Choose lane and target context",
      "Explain the tool problem",
      "Show inputs and assumptions",
      "Describe the method and sample output",
      "Review for publication"
    ],
    requiredSections: ["overview", "questionOrMission", "evidence", "analysis", "recommendations"],
    checklist: [
      { key: "title", label: "Clear tool title", detail: "Readers should know what the tool helps them do." },
      { key: "abstract", label: "Short abstract", detail: "Explain the tool in two or three calm sentences." },
      { key: "mission", label: "Problem or mission", detail: "Name the decision problem the tool is built to help with." },
      { key: "method", label: "Method explained", detail: "Show how the tool turns inputs into outputs." },
      { key: "limits", label: "Limits included", detail: "Tell readers what the tool cannot do well yet." },
      { key: "references", label: "References added", detail: "List the sources or models that informed the tool." }
    ],
    examples: [
      {
        title: "Strong opening",
        body: "This tool helps students compare how two different revenue-sharing rates change the league's revenue inequality."
      }
    ],
    laneSections: [
      { key: "inputs", title: "Inputs and assumptions", prompt: "What information does the tool need before it can run?" },
      { key: "method", title: "How the tool works", prompt: "Explain the steps in plain language." },
      { key: "exampleOutput", title: "Example output", prompt: "Show what the tool produces and how to read it." },
      { key: "limits", title: "Limits and risks", prompt: "Where could the tool oversimplify the league?" }
    ],
    externalReadinessRules: [
      "The title should work for a public audience outside your class.",
      "The abstract should explain the tool without internal classroom wording.",
      "An outside reader should understand the example output without extra classroom help nearby."
    ]
  },
  POLICY_REFORM_ARCHITECTS: {
    lane: "POLICY_REFORM_ARCHITECTS",
    publicationType: PublicationType.POLICY_MEMO,
    outputLabel: "Reform Support Brief",
    overviewLabel: "Support brief summary",
    steps: [
      "Choose the issue",
      "Explain the rule problem",
      "Draft the support brief sections",
      "Connect the evidence and proposal context",
      "Review for publication"
    ],
    requiredSections: ["overview", "context", "analysis", "recommendations"],
    checklist: [
      { key: "title", label: "Focused support title", detail: "The title should say what reform pressure the brief is helping explain." },
      { key: "abstract", label: "Fast summary", detail: "Readers should understand the support brief before they read the full body." },
      { key: "context", label: "Current rule context", detail: "Explain the existing rule before you show how the support work helps." },
      { key: "analysis", label: "Impact support", detail: "Say who gains, who loses, and what evidence supports that pattern." },
      { key: "tradeoffs", label: "Tradeoffs included", detail: "A strong support brief shows what gets harder too." },
      { key: "references", label: "References added", detail: "Show the evidence behind the support recommendation." }
    ],
    examples: [
      {
        title: "Strong support brief start",
        body: "The current second apron threshold slows large-market spending, but it also blocks small-market teams from using planned short-term spending spikes."
      }
    ],
    laneSections: [
      { key: "currentRule", title: "Current rule context", prompt: "Which rule is creating pressure in the league right now?" },
      { key: "winnersLosers", title: "Expected winners and losers", prompt: "Who benefits and who loses flexibility if the rule changes?" },
      { key: "tradeoffs", title: "Tradeoffs", prompt: "What new problem might your reform create?" }
    ],
    externalReadinessRules: [
      "The brief should define BOW-specific terms the first time they appear.",
      "The support recommendation should still make sense if shared as a public-facing article.",
      "Avoid writing that only classmates would understand."
    ]
  },
  STRATEGIC_OPERATORS: {
    lane: "STRATEGIC_OPERATORS",
    publicationType: PublicationType.TEAM_STRATEGY_DOSSIER,
    outputLabel: "Team Strategy Dossier",
    overviewLabel: "Three-year plan summary",
    steps: [
      "Choose the team",
      "Diagnose the current position",
      "Build the three-year plan",
      "Show risks and success measures",
      "Review for publication"
    ],
    requiredSections: ["overview", "questionOrMission", "analysis", "recommendations"],
    checklist: [
      { key: "title", label: "Team-focused title", detail: "Readers should know which team and window the dossier covers." },
      { key: "abstract", label: "Executive overview", detail: "Summarize the three-year direction first." },
      { key: "question", label: "Strategy mission", detail: "State what the team is trying to become." },
      { key: "analysis", label: "Financial diagnosis", detail: "Explain payroll, tax pressure, and constraints." },
      { key: "recommendations", label: "Year-by-year plan", detail: "Show concrete moves across the planning window." },
      { key: "references", label: "References added", detail: "List the evidence or league records behind the plan." }
    ],
    examples: [
      {
        title: "Strong planning move",
        body: "Year 1 should preserve flexibility by avoiding long mid-tier contracts while the team studies whether its core is worth a full contention cycle."
      }
    ],
    laneSections: [
      { key: "yearOne", title: "Year 1 plan", prompt: "What should happen first?" },
      { key: "yearTwo", title: "Year 2 plan", prompt: "What changes after the first season?" },
      { key: "yearThree", title: "Year 3 plan", prompt: "What outcome are you aiming for by the end of the window?" },
      { key: "risks", title: "Risks and contingencies", prompt: "What could go wrong, and how would you respond?" }
    ],
    externalReadinessRules: [
      "The dossier should explain the team's starting condition clearly enough for a new reader.",
      "The year-by-year plan should read cleanly in a printable format.",
      "Avoid internal classroom shorthand in the strategy sections."
    ]
  },
  ECONOMIC_INVESTIGATORS: {
    lane: "ECONOMIC_INVESTIGATORS",
    publicationType: PublicationType.RESEARCH_BRIEF,
    outputLabel: "Research Brief",
    overviewLabel: "Research summary",
    steps: [
      "Choose the issue",
      "Write the research question",
      "Present evidence and findings",
      "Interpret the pattern",
      "Review for publication"
    ],
    requiredSections: ["overview", "questionOrMission", "evidence", "analysis", "recommendations"],
    checklist: [
      { key: "title", label: "Research title", detail: "The title should name the economic question or pattern." },
      { key: "abstract", label: "Research abstract", detail: "Summarize the question, evidence, and main finding." },
      { key: "question", label: "Research question", detail: "A reader should know exactly what you investigated." },
      { key: "evidence", label: "Evidence named", detail: "Explain what data or records you used." },
      { key: "analysis", label: "Interpretation included", detail: "Tell readers what the evidence means." },
      { key: "references", label: "References added", detail: "List the sources that support the brief." }
    ],
    examples: [
      {
        title: "Strong research question",
        body: "Do small-market teams lose long-term flexibility faster than large-market teams once tax concentration rises above 0.70?"
      }
    ],
    laneSections: [
      { key: "pattern", title: "Pattern discovered", prompt: "What trend or imbalance did you notice?" },
      { key: "interpretation", title: "Interpretation", prompt: "Why does that pattern matter for the league?" },
      { key: "nextQuestion", title: "Next question", prompt: "What should investigators test next?" }
    ],
    externalReadinessRules: [
      "An outside reader should understand the research question without classroom context.",
      "Evidence descriptions should be clear enough for a web article or PDF reader.",
      "The recommendation or next question should sound publishable, not like assignment instructions."
    ]
  }
};

function stringHasContent(value: string | null | undefined) {
  return Boolean(value && value.trim().length >= 8);
}

function listHasContent<T>(value: T[] | null | undefined) {
  return Boolean(value && value.length > 0);
}

export function getLaneTemplate(lane: LaneTag) {
  return laneTemplates[lane];
}

export function getAllLaneTemplates() {
  return Object.values(laneTemplates);
}

export function getPublicationDisplayLabel(input: {
  publicationType: PublicationType;
  sourceType?: PublicationSourceType | null;
  lanePrimary?: LaneTag | null;
}) {
  if (
    input.publicationType === PublicationType.POLICY_MEMO &&
    (input.sourceType === PublicationSourceType.PROJECT ||
      input.lanePrimary === "POLICY_REFORM_ARCHITECTS")
  ) {
    return "Reform Support Brief";
  }

  return publicationTypeLabels[input.publicationType];
}

export function getPrimaryLaneTag(
  laneTags: LaneTag[],
  projectType: ProjectType = ProjectType.INVESTIGATION
): LaneTag {
  if (laneTags[0]) {
    return laneTags[0];
  }

  if (projectType === ProjectType.TOOL) {
    return "TOOL_BUILDERS";
  }

  if (projectType === ProjectType.STRATEGY) {
    return "STRATEGIC_OPERATORS";
  }

  if (projectType === ProjectType.PROPOSAL_SUPPORT) {
    return "POLICY_REFORM_ARCHITECTS";
  }

  return "ECONOMIC_INVESTIGATORS";
}

export function projectTypeToPublicationType(projectType: ProjectType, lanePrimary: LaneTag) {
  if (projectType === ProjectType.TOOL) {
    return PublicationType.TOOL_BRIEF;
  }

  if (projectType === ProjectType.STRATEGY) {
    return PublicationType.TEAM_STRATEGY_DOSSIER;
  }

  if (projectType === ProjectType.PROPOSAL_SUPPORT) {
    return PublicationType.POLICY_MEMO;
  }

  return projectPublicationTypeByLane[lanePrimary];
}

function emptyLaneSections(lane: LaneTag): LaneSectionEntry[] {
  return getLaneTemplate(lane).laneSections.map((section) => ({
    key: section.key,
    title: section.title,
    prompt: section.prompt,
    value: ""
  }));
}

export function createEmptyProjectContent(lane: LaneTag): ProjectSubmissionContent {
  return {
    overview: "",
    questionOrMission: "",
    context: "",
    evidence: "",
    analysis: "",
    recommendations: "",
    laneSections: emptyLaneSections(lane),
    artifacts: [],
    reflection: ""
  };
}

export function createEmptyProposalContent(): ProposalSubmissionContent {
  return {
    problem: "",
    currentRuleContext: "",
    proposedChange: "",
    impactAnalysis: "",
    tradeoffs: "",
    sandboxInterpretation: "",
    recommendation: ""
  };
}

export function parseReferences(value: unknown): ReferenceEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const references: ReferenceEntry[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const reference: ReferenceEntry = {
      label: String(record.label ?? "").trim(),
      url: String(record.url ?? "").trim(),
      sourceType: (String(record.sourceType ?? "OTHER").trim() || "OTHER") as ReferenceEntry["sourceType"],
      note: String(record.note ?? "").trim() || undefined
    };

    if (reference.label && reference.url) {
      references.push(reference);
    }
  }

  return references;
}

export function parseKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function parseTakeaways(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => String(entry).trim()).filter(Boolean).slice(0, 6);
}

export function parseChecklist(value: unknown): SubmissionChecklistItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      return {
        key: String(record.key ?? "").trim(),
        label: String(record.label ?? "").trim(),
        detail: String(record.detail ?? "").trim(),
        complete: Boolean(record.complete)
      };
    })
    .filter((entry): entry is SubmissionChecklistItem => Boolean(entry?.key && entry.label));
}

export function parseProjectContent(value: unknown, lane: LaneTag): ProjectSubmissionContent {
  const fallback = createEmptyProjectContent(lane);

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const laneSections = Array.isArray(record.laneSections)
    ? (record.laneSections as LaneSectionEntry[]).map((section, index) => ({
        key: String(section?.key ?? fallback.laneSections[index]?.key ?? `section-${index + 1}`),
        title: String(section?.title ?? fallback.laneSections[index]?.title ?? `Section ${index + 1}`),
        prompt: String(section?.prompt ?? fallback.laneSections[index]?.prompt ?? ""),
        value: String(section?.value ?? "")
      }))
    : fallback.laneSections;

  return {
    overview: String(record.overview ?? ""),
    questionOrMission: String(record.questionOrMission ?? ""),
    context: String(record.context ?? ""),
    evidence: String(record.evidence ?? ""),
    analysis: String(record.analysis ?? ""),
    recommendations: String(record.recommendations ?? ""),
    laneSections,
    artifacts: Array.isArray(record.artifacts) ? (record.artifacts as ArtifactLink[]) : fallback.artifacts,
    reflection: String(record.reflection ?? "")
  };
}

export function parseProposalContent(value: unknown): ProposalSubmissionContent {
  const fallback = createEmptyProposalContent();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const record = value as Record<string, unknown>;

  return {
    problem: String(record.problem ?? ""),
    currentRuleContext: String(record.currentRuleContext ?? ""),
    proposedChange: String(record.proposedChange ?? ""),
    impactAnalysis: String(record.impactAnalysis ?? ""),
    tradeoffs: String(record.tradeoffs ?? ""),
    sandboxInterpretation: String(record.sandboxInterpretation ?? ""),
    recommendation: String(record.recommendation ?? "")
  };
}

export function backfillProjectContent(params: {
  summary: string;
  findingsMd: string;
  projectType: ProjectType;
  laneTags: LaneTag[];
  artifactLinks: ArtifactLink[];
}): ProjectSubmissionContent {
  const lane = getPrimaryLaneTag(params.laneTags, params.projectType);
  const template = getLaneTemplate(lane);
  const base = createEmptyProjectContent(lane);

  base.overview = params.summary;
  base.questionOrMission =
    params.projectType === ProjectType.STRATEGY
      ? "How should this team use the next three seasons to improve its position?"
      : params.projectType === ProjectType.TOOL
        ? "What league decision should this tool make easier to understand?"
        : "What question does this project help the league answer?";
  base.context = params.summary;
  base.evidence = params.findingsMd;
  base.analysis = params.findingsMd;
  base.recommendations = params.findingsMd;
  base.artifacts = params.artifactLinks;
  base.laneSections = template.laneSections.map((section) => ({
    key: section.key,
    title: section.title,
    prompt: section.prompt,
    value: params.findingsMd
  }));

  return base;
}

export function backfillProposalContent(narrative: ProposalNarrative): ProposalSubmissionContent {
  return {
    problem: narrative.problem,
    currentRuleContext: narrative.problem,
    proposedChange: narrative.proposedChange,
    impactAnalysis: narrative.expectedImpact,
    tradeoffs: narrative.tradeoffs,
    sandboxInterpretation: "",
    recommendation: narrative.proposedChange
  };
}

export function buildProjectChecklist(args: ProjectChecklistArgs, lane: LaneTag) {
  const template = getLaneTemplate(lane);

  const completion = {
    title: stringHasContent(args.title),
    abstract: stringHasContent(args.abstract),
    mission: stringHasContent(args.essentialQuestion),
    context: stringHasContent(args.content.context),
    evidence: stringHasContent(args.content.evidence),
    analysis: stringHasContent(args.content.analysis),
    recommendations: stringHasContent(args.content.recommendations),
    method: args.content.laneSections.some((section) => stringHasContent(section.value)),
    limits: args.content.laneSections.some(
      (section) => section.key.toLowerCase().includes("limit") && stringHasContent(section.value)
    ),
    question: stringHasContent(args.content.questionOrMission),
    tradeoffs: args.content.laneSections.some(
      (section) => section.key.toLowerCase().includes("tradeoff") && stringHasContent(section.value)
    ),
    references: listHasContent(args.references),
    keywords: listHasContent(args.keywords)
  };

  return template.checklist.map((item) => ({
    ...item,
    complete: completion[item.key as keyof typeof completion] ?? false
  }));
}

export function buildProposalChecklist(args: ProposalChecklistArgs) {
  const checks: SubmissionChecklistItem[] = [
    {
      key: "title",
      label: "Focused memo title",
      detail: "A reader should understand the reform topic immediately.",
      complete: stringHasContent(args.title)
    },
    {
      key: "abstract",
      label: "Executive summary",
      detail: "The abstract should summarize the problem, reform, and likely effect.",
      complete: stringHasContent(args.abstract)
    },
    {
      key: "problem",
      label: "Problem section complete",
      detail: "Explain the league problem with enough context for a new reader.",
      complete: stringHasContent(args.content.problem)
    },
    {
      key: "currentRuleContext",
      label: "Current rule explained",
      detail: "Name the current rule setup before you recommend changes.",
      complete: stringHasContent(args.content.currentRuleContext)
    },
    {
      key: "impactAnalysis",
      label: "Impact analysis included",
      detail: "A strong memo says what changes and who is affected.",
      complete: stringHasContent(args.content.impactAnalysis)
    },
    {
      key: "sandboxInterpretation",
      label: "Sandbox interpreted",
      detail: "Do not just run the model. Explain what the result means.",
      complete: stringHasContent(args.content.sandboxInterpretation) && args.sandboxInterpretationSaved
    },
    {
      key: "recommendation",
      label: "Recommendation stated",
      detail: "End with a clear recommendation for the league.",
      complete: stringHasContent(args.content.recommendation)
    },
    {
      key: "references",
      label: "References added",
      detail: "List the sources behind the memo.",
      complete: listHasContent(args.references)
    },
    {
      key: "keywords",
      label: "Keywords added",
      detail: "Use a few search terms to make the memo easy to find later.",
      complete: listHasContent(args.keywords)
    }
  ];

  return checks;
}

export function buildExternalReadinessChecklist(input: {
  title: string;
  abstract: string;
  slug: string;
  references: ReferenceEntry[];
  keywords: string[];
  requiredSections: Array<{ label: string; value: string }>;
}) {
  return [
    {
      key: "external-title",
      label: "Title works outside the classroom",
      detail: "An outside reader should understand the title on its own.",
      complete: stringHasContent(input.title)
    },
    {
      key: "external-abstract",
      label: "Abstract is publication-ready",
      detail: "The abstract should read like a short web or PDF summary.",
      complete: stringHasContent(input.abstract)
    },
    {
      key: "external-slug",
      label: "Stable publication slug",
      detail: "The record needs a clean stable URL slug for future publication.",
      complete: input.slug.trim().length >= 4
    },
    {
      key: "external-sections",
      label: "Core sections complete",
      detail: "The main sections should all have enough detail for public readers.",
      complete: input.requiredSections.every((section) => stringHasContent(section.value))
    },
    {
      key: "external-references",
      label: "References included",
      detail: "External publication needs visible source support.",
      complete: listHasContent(input.references)
    },
    {
      key: "external-keywords",
      label: "Keywords included",
      detail: "Keywords help search and archive use later.",
      complete: listHasContent(input.keywords)
    }
  ];
}

export function createPublicationSlug(title: string, id: string) {
  const clean = slugify(title);
  return clean.length >= 4 ? clean : `${clean || "publication"}-${id.slice(-6)}`;
}

export function buildCitationText(input: {
  title: string;
  authorNames: string[];
  publishedAt: Date | null;
  publicationType: PublicationType;
  version: number;
}) {
  const authorLine = input.authorNames.join(", ");
  const year = input.publishedAt?.getFullYear() ?? new Date().getFullYear();
  return `${authorLine} (${year}). ${input.title}. BOW Universe ${input.publicationType.replaceAll("_", " ")}. v${input.version}.`;
}

export function buildAuthorLine(authorNames: string[]) {
  if (authorNames.length === 0) {
    return "Unknown author";
  }

  if (authorNames.length === 1) {
    return authorNames[0];
  }

  if (authorNames.length === 2) {
    return `${authorNames[0]} and ${authorNames[1]}`;
  }

  return `${authorNames[0]}, ${authorNames[1]}, and ${authorNames.length - 2} others`;
}

export function buildProjectPublicationMetadata(input: {
  title: string;
  abstract: string;
  keywords: string[];
  issueTitle?: string | null;
  teamName?: string | null;
  seasonLabel?: string | null;
  authorNames: string[];
  publicationType: PublicationType;
  version: number;
  publishedAt: Date | null;
  externalReady: boolean;
  externalApproved: boolean;
}): PublicationMetadata {
  return {
    title: input.title,
    abstract: input.abstract,
    keywords: input.keywords,
    authorLine: buildAuthorLine(input.authorNames),
    publicationType: input.publicationType,
    publishedAt: input.publishedAt?.toISOString() ?? null,
    version: input.version,
    citationText: buildCitationText(input),
    issue: input.issueTitle ?? null,
    team: input.teamName ?? null,
    season: input.seasonLabel ?? null,
    externalReady: input.externalReady,
    externalApproved: input.externalApproved
  };
}

export function buildProposalPublicationMetadata(input: {
  title: string;
  abstract: string;
  keywords: string[];
  issueTitle?: string | null;
  teamName?: string | null;
  seasonLabel?: string | null;
  authorNames: string[];
  version: number;
  publishedAt: Date | null;
  externalReady: boolean;
  externalApproved: boolean;
}): PublicationMetadata {
  return buildProjectPublicationMetadata({
    ...input,
    publicationType: PublicationType.POLICY_MEMO
  });
}

export function isInternallyPublishedProject(status: SubmissionStatus) {
  return (
    status === SubmissionStatus.PUBLISHED_INTERNAL ||
    status === SubmissionStatus.MARKED_EXTERNAL_READY ||
    status === SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
  );
}

export function isInternallyPublishedProposal(status: ProposalStatus) {
  return (
    status === ProposalStatus.PUBLISHED_INTERNAL ||
    status === ProposalStatus.MARKED_EXTERNAL_READY ||
    status === ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
  );
}

export function getSuggestedProjectStatus(intent: string) {
  return intent === "SUBMITTED" ? SubmissionStatus.SUBMITTED : SubmissionStatus.DRAFT;
}

export function getSuggestedProposalStatus(intent: string) {
  return intent === "SUBMITTED" ? ProposalStatus.SUBMITTED : ProposalStatus.DRAFT;
}

export function getLaneLabel(lane: LaneTag | null | undefined) {
  return lane ? laneTagLabels[lane] : "Unassigned lane";
}
