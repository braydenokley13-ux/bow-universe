import {
  AiArtifactKind,
  AiConversationKind,
  AiMessageRole,
  AiProvider,
  AiRunStatus,
  Prisma,
  ProjectArtifactFocus,
  ProjectCampaignEventKind,
  ProjectMilestoneKey,
  ProjectScale,
  PublicationSourceType
} from "@prisma/client";
import { z } from "zod";

import { buildIssueResearchPreview, classifyIssueWorkGap } from "@/lib/discovery-guidance";
import {
  buildProjectCampaignAssessment,
  type ProjectCampaignAssessment
} from "@/lib/project-campaign";
import { prisma } from "@/lib/prisma";
import { buildRecommendedMissionCandidates } from "@/lib/student-flow";
import { getAiProviderClient } from "@/server/ai/client";
import {
  loadIssueAiContext,
  loadProjectAiContext,
  loadStudentMissionContext
} from "@/server/ai/context";
import { buildAiHash } from "@/server/ai/hash";
import { assertAiRateLimit, sanitizeAiText } from "@/server/ai/security";
import {
  deriveTeamPulse,
  getLatestHumanProgressAt,
  isProjectStalled,
  STALL_THRESHOLD_DAYS
} from "@/server/ai/signals";
import {
  AI_PROMPT_VERSION,
  adversaryResponseSchema,
  argumentResponseSchema,
  issueIntelResponseSchema,
  missionResponseSchema,
  narrativeResponseSchema,
  orientResponseSchema,
  qualityResponseSchema,
  researchResponseSchema,
  teamPulseResponseSchema,
  type AiArtifactEnvelope,
  type AiSource,
  type AdversaryResponse,
  type ArgumentResponse,
  type IssueIntelResponse,
  type MissionResponse,
  type NarrativeResponse,
  type OrientResponse,
  type QualityResponse,
  type ResearchResponse,
  type TeamPulseResponse,
  type WritingResponse,
  writingResponseSchema
} from "@/server/ai/types";
import {
  createProjectCampaignAiGuidanceEvent,
  createProjectCampaignStallEvent,
  createProjectCampaignTeamPulseEvent,
  syncProjectCampaignState
} from "@/server/project-campaign";

function parseIssueMetrics(metricsJson: unknown) {
  if (!metricsJson || typeof metricsJson !== "object") {
    return {};
  }

  return metricsJson as {
    revenueInequality?: number | null;
    taxConcentration?: number | null;
    parityIndex?: number | null;
    smallVsBigCompetitiveness?: number | null;
  };
}

type ProjectContext = NonNullable<Awaited<ReturnType<typeof loadProjectAiContext>>>;
type IssueContext = NonNullable<Awaited<ReturnType<typeof loadIssueAiContext>>>;

type RunArtifactTaskParams<T> = {
  kind: AiConversationKind;
  artifactKind: AiArtifactKind;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  title: string;
  modelClass: "cheap" | "reasoning";
  inputHash: string;
  userId?: string | null;
  projectId?: string | null;
  issueId?: string | null;
  sourceType?: PublicationSourceType | null;
  sourceId?: string | null;
  milestoneKey?: ProjectMilestoneKey | null;
  userMessage?: string | null;
  systemPrompt: string;
  userPrompt: string;
  fallback: () => T;
  buildBody: (data: T) => string;
  extractSources?: (data: T) => AiSource[];
  cacheEnabled?: boolean;
};

export type ProjectAiReadiness = {
  hashes: {
    research: string;
    argument: string;
    adversary: string;
    quality: string;
  };
  researchFresh: boolean;
  argumentFresh: boolean;
  adversaryPassed: boolean;
  qualityPassed: boolean;
  latestResearchArtifactId: string | null;
  latestArgumentArtifactId: string | null;
  latestAdversaryArtifactId: string | null;
  latestQualityArtifactId: string | null;
};

function artifactStructured<T>(
  artifact: { structuredJson: unknown },
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
) {
  const parsed = schema.safeParse(artifact.structuredJson);
  return parsed.success ? parsed.data : null;
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  return JSON.parse(candidate);
}

function summarizeSourcesForArtifact(sources: AiSource[]) {
  return sources
    .map((source) => `- ${source.title}${source.note ? `: ${source.note}` : ""}`)
    .join("\n");
}

function getLatestArtifact(
  project: ProjectContext["project"],
  kind: AiArtifactKind
) {
  return project.aiArtifacts.find((artifact) => artifact.kind === kind) ?? null;
}

function buildProjectSourceCandidates(context: ProjectContext): AiSource[] {
  const sources: AiSource[] = context.references.map((reference) => ({
    title: reference.label,
    url: reference.url,
    sourceType: reference.sourceType,
    note: reference.note,
    excerptMd: undefined
  }));

  if (context.project.primaryIssue?.evidenceMd?.trim()) {
    sources.unshift({
      title: `${context.project.primaryIssue.title} issue notes`,
      url: null,
      sourceType: "INTERNAL_ISSUE",
      note: "Existing BOW issue evidence notes already attached to this project.",
      excerptMd: context.project.primaryIssue.evidenceMd.slice(0, 280)
    });
  }

  return sources.slice(0, 6);
}

export function buildResearchHash(context: ProjectContext) {
  return buildAiHash({
    projectId: context.project.id,
    issueId: context.project.issueId,
    essentialQuestion: context.project.essentialQuestion,
    summary: context.project.summary,
    abstract: context.project.abstract,
    overview: context.content.overview,
    context: context.content.context,
    evidence: context.content.evidence,
    references: context.references,
    evidenceBoardDeliverable:
      context.project.deliverables.find((deliverable) => deliverable.key === "EVIDENCE_BOARD")?.contentMd ?? ""
  });
}

export function buildArgumentHash(context: ProjectContext) {
  const latestResearch = getLatestArtifact(context.project, AiArtifactKind.RESEARCH_LOG);
  return buildAiHash({
    researchHash: buildResearchHash(context),
    latestResearchArtifactId: latestResearch?.id ?? null,
    latestResearchUpdatedAt: latestResearch?.updatedAt.toISOString() ?? null
  });
}

export function buildAdversaryHash(context: ProjectContext) {
  const latestArgument = getLatestArtifact(context.project, AiArtifactKind.ARGUMENT_BACKBONE);
  return buildAiHash({
    argumentHash: buildArgumentHash(context),
    latestArgumentArtifactId: latestArgument?.id ?? null,
    latestArgumentUpdatedAt: latestArgument?.updatedAt.toISOString() ?? null,
    evidence: context.content.evidence,
    references: context.references
  });
}

export function buildQualityHash(context: ProjectContext) {
  return buildAiHash({
    projectId: context.project.id,
    artifactFocus: context.project.artifactFocus,
    title: context.project.title,
    summary: context.project.summary,
    essentialQuestion: context.project.essentialQuestion,
    methodsSummary: context.project.methodsSummary,
    overview: context.content.overview,
    context: context.content.context,
    evidence: context.content.evidence,
    analysis: context.content.analysis,
    recommendations: context.content.recommendations,
    reflection: context.content.reflection,
    findingsMd: context.project.findingsMd,
    deliverables: context.project.deliverables.map((deliverable) => ({
      key: deliverable.key,
      contentMd: deliverable.contentMd,
      artifactUrl: deliverable.artifactUrl,
      complete: deliverable.complete
    }))
  });
}

export function deriveProjectAiReadiness(context: ProjectContext): ProjectAiReadiness {
  const hashes = {
    research: buildResearchHash(context),
    argument: buildArgumentHash(context),
    adversary: buildAdversaryHash(context),
    quality: buildQualityHash(context)
  };

  const latestResearch = getLatestArtifact(context.project, AiArtifactKind.RESEARCH_LOG);
  const latestArgument = getLatestArtifact(context.project, AiArtifactKind.ARGUMENT_BACKBONE);
  const latestAdversary = getLatestArtifact(context.project, AiArtifactKind.ADVERSARY_REVIEW);
  const latestQuality = getLatestArtifact(context.project, AiArtifactKind.QUALITY_REVIEW);

  const adversaryData = latestAdversary
    ? artifactStructured(latestAdversary, adversaryResponseSchema)
    : null;
  const qualityData = latestQuality ? artifactStructured(latestQuality, qualityResponseSchema) : null;

  return {
    hashes,
    researchFresh: latestResearch?.inputHash === hashes.research,
    argumentFresh: latestArgument?.inputHash === hashes.argument,
    adversaryPassed:
      latestAdversary?.inputHash === hashes.adversary && Boolean(adversaryData?.passed),
    qualityPassed: latestQuality?.inputHash === hashes.quality && Boolean(qualityData?.passed),
    latestResearchArtifactId: latestResearch?.id ?? null,
    latestArgumentArtifactId: latestArgument?.id ?? null,
    latestAdversaryArtifactId: latestAdversary?.id ?? null,
    latestQualityArtifactId: latestQuality?.id ?? null
  };
}

function researchBody(data: ResearchResponse) {
  return [
    `Next question: ${data.question}`,
    "",
    data.coachingNote,
    "",
    "What we know:",
    ...data.researchLog.whatWeKnow.map((item) => `- ${item}`),
    "",
    "Gaps:",
    ...data.researchLog.gaps.map((item) => `- ${item}`),
    "",
    "Next moves:",
    ...data.researchLog.nextMoves.map((item) => `- ${item}`)
  ]
    .filter(Boolean)
    .join("\n");
}

function argumentBody(data: ArgumentResponse) {
  return [
    `Claim: ${data.claim}`,
    "",
    "Ranked evidence:",
    ...data.rankedEvidence.map((item, index) => `${index + 1}. ${item}`),
    "",
    `Counterargument: ${data.counterargument}`,
    `Rebuttal: ${data.rebuttal}`,
    `Recommendation: ${data.recommendation}`,
    "",
    data.coachingNote
  ].join("\n");
}

function adversaryBody(data: AdversaryResponse) {
  return [
    data.passed ? "Adversarial mentor: passed." : "Adversarial mentor: not clear yet.",
    "",
    `Weakest evidence: ${data.weakestEvidence}`,
    `Who disagrees: ${data.disagreement}`,
    `Hardest question: ${data.hardestQuestion}`,
    "",
    "Required fixes:",
    ...data.requiredFixes.map((item) => `- ${item}`),
    "",
    data.coachingNote
  ].join("\n");
}

function writingBody(data: WritingResponse) {
  return [
    data.overallAssessment,
    "",
    "Strengths:",
    ...data.strengths.map((item) => `- ${item}`),
    "",
    "Revision priorities:",
    ...data.revisionPriorities.map((item) => `- ${item}`),
    "",
    "Line edits:",
    ...data.lineEdits.map((item) => `- ${item}`),
    "",
    `Compared to prior draft: ${data.comparedToPriorDraft}`
  ].join("\n");
}

function qualityBody(data: QualityResponse) {
  return [
    `${data.scoreLabel} (${data.passed ? "ready" : "not ready"})`,
    "",
    "Rubric:",
    ...data.rubricItems.map((item) => `- [${item.status}] ${item.label}: ${item.detail}`),
    "",
    "Blockers:",
    ...data.blockers.map((item) => `- ${item}`),
    "",
    "Strengths:",
    ...data.strengths.map((item) => `- ${item}`)
  ].join("\n");
}

function missionBody(data: MissionResponse) {
  return `${data.title}\n\n${data.body}\n\nWhy now: ${data.reason}`;
}

function orientBody(data: OrientResponse) {
  return [
    data.title,
    "",
    data.whereYouAre,
    "",
    `Why it matters: ${data.whyItMatters}`,
    "",
    "Done:",
    ...data.done.map((item) => `- ${item}`),
    "",
    "Not done:",
    ...data.notDone.map((item) => `- ${item}`),
    "",
    `Next move: ${data.nextMove}`
  ].join("\n");
}

function issueIntelBody(data: IssueIntelResponse) {
  return [
    "What is hard:",
    ...data.whatIsHard.map((item) => `- ${item}`),
    "",
    `Real debate: ${data.realDebate}`,
    "",
    "Stakeholders:",
    ...data.stakeholders.map((item) => `- ${item}`),
    "",
    "Strong work looks like:",
    ...data.strongProjectLooksLike.map((item) => `- ${item}`),
    "",
    "Weak work looks like:",
    ...data.weakProjectLooksLike.map((item) => `- ${item}`),
    "",
    "First moves:",
    ...data.firstMoves.map((item) => `- ${item}`)
  ].join("\n");
}

function teamPulseBody(data: TeamPulseResponse) {
  return [
    `Team pulse: ${data.status}`,
    "",
    data.prompt,
    "",
    "Findings:",
    ...data.findings.map((item) => `- ${item}`),
    "",
    "Contribution breakdown:",
    ...data.contributions.map(
      (item) => `- ${item.name}: ${item.activityCount} signal(s), ${Math.round(item.share * 100)}% share`
    )
  ].join("\n");
}

function narrativeBody(data: NarrativeResponse) {
  return data.paragraph;
}

async function getOrCreateConversation(params: {
  kind: AiConversationKind;
  title: string;
  userId?: string | null;
  projectId?: string | null;
  issueId?: string | null;
  sourceType?: PublicationSourceType | null;
  sourceId?: string | null;
  milestoneKey?: ProjectMilestoneKey | null;
}) {
  const existing = await prisma.aiConversation.findFirst({
    where: {
      kind: params.kind,
      userId: params.userId ?? null,
      projectId: params.projectId ?? null,
      issueId: params.issueId ?? null,
      sourceType: params.sourceType ?? null,
      sourceId: params.sourceId ?? null,
      milestoneKey: params.milestoneKey ?? null
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.aiConversation.create({
    data: {
      kind: params.kind,
      title: params.title,
      promptVersion: AI_PROMPT_VERSION,
      userId: params.userId ?? null,
      projectId: params.projectId ?? null,
      issueId: params.issueId ?? null,
      sourceType: params.sourceType ?? null,
      sourceId: params.sourceId ?? null,
      milestoneKey: params.milestoneKey ?? null
    }
  });
}

async function findCachedArtifact(params: {
  kind: AiArtifactKind;
  inputHash: string;
  userId?: string | null;
  projectId?: string | null;
  issueId?: string | null;
  sourceType?: PublicationSourceType | null;
  sourceId?: string | null;
  milestoneKey?: ProjectMilestoneKey | null;
}) {
  return prisma.aiArtifact.findFirst({
    where: {
      kind: params.kind,
      inputHash: params.inputHash,
      userId: params.userId ?? null,
      projectId: params.projectId ?? null,
      issueId: params.issueId ?? null,
      sourceType: params.sourceType ?? null,
      sourceId: params.sourceId ?? null,
      milestoneKey: params.milestoneKey ?? null
    },
    include: {
      run: true,
      sources: {
        orderBy: {
          rank: "asc"
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}

function envelopeFromArtifact<T>(
  artifact: Awaited<ReturnType<typeof findCachedArtifact>>,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  cached: boolean
): AiArtifactEnvelope<T> {
  if (!artifact) {
    throw new Error("AI artifact not found.");
  }

  return {
    artifactId: artifact.id,
    conversationId: artifact.conversationId ?? null,
    cached,
    provider: artifact.run?.provider ?? "LOCAL_FALLBACK",
    model: artifact.run?.model ?? "deterministic-fallback",
    promptVersion: artifact.promptVersion,
    bodyMd: artifact.bodyMd,
    sources: artifact.sources.map((source) => ({
      title: source.title,
      url: source.url ?? null,
      sourceType: source.sourceType ?? "OTHER",
      note: source.note ?? undefined,
      excerptMd: source.excerptMd ?? undefined
    })),
    data: schema.parse(artifact.structuredJson)
  };
}

async function runArtifactTask<T>(params: RunArtifactTaskParams<T>): Promise<AiArtifactEnvelope<T>> {
  const conversation = await getOrCreateConversation({
    kind: params.kind,
    title: params.title,
    userId: params.userId,
    projectId: params.projectId,
    issueId: params.issueId,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    milestoneKey: params.milestoneKey
  });

  const userMessage = params.userMessage ? sanitizeAiText(params.userMessage, 2000) : "";

  if (userMessage) {
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: AiMessageRole.USER,
        bodyMd: userMessage
      }
    });
  }

  if (params.cacheEnabled !== false && !userMessage) {
    const cachedArtifact = await findCachedArtifact({
      kind: params.artifactKind,
      inputHash: params.inputHash,
      userId: params.userId,
      projectId: params.projectId,
      issueId: params.issueId,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      milestoneKey: params.milestoneKey
    });

    if (cachedArtifact) {
      return envelopeFromArtifact(cachedArtifact, params.schema, true);
    }
  }

  const provider = getAiProviderClient();
  let providerName: AiProvider = AiProvider.LOCAL_FALLBACK;
  let model = "deterministic-fallback";
  let rawResponse: unknown = null;
  let data: T;
  let errorMessage: string | null = null;

  if (provider.isConfigured()) {
    try {
      const response = await provider.generateText({
        modelClass: params.modelClass,
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt
      });
      providerName =
        response.provider === "OPENAI" ? AiProvider.OPENAI : AiProvider.ANTHROPIC;
      model = response.model;
      rawResponse = response.raw;
      data = params.schema.parse(extractJsonObject(response.text));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "AI generation failed.";
      providerName = AiProvider.LOCAL_FALLBACK;
      model = "deterministic-fallback";
      rawResponse = null;
      data = params.fallback();
    }
  } else {
    data = params.fallback();
  }

  const bodyMd = sanitizeAiText(params.buildBody(data), 12000);
  const sources = (params.extractSources?.(data) ?? []).slice(0, 8);

  const run = await prisma.aiRun.create({
    data: {
      conversationId: conversation.id,
      kind: params.kind,
      provider: providerName,
      model,
      promptVersion: AI_PROMPT_VERSION,
      status: errorMessage ? AiRunStatus.FAILED : AiRunStatus.COMPLETED,
      inputHash: params.inputHash,
      errorMessage,
      requestJson: {
        title: params.title,
        inputHash: params.inputHash,
        milestoneKey: params.milestoneKey ?? null
      },
      responseJson: rawResponse && typeof rawResponse === "object" ? (rawResponse as object) : undefined,
      metadataJson: {
        usedFallback: providerName === AiProvider.LOCAL_FALLBACK
      },
      completedAt: new Date()
    }
  });

  const artifact = await prisma.aiArtifact.create({
    data: {
      conversationId: conversation.id,
      runId: run.id,
      kind: params.artifactKind,
      promptVersion: AI_PROMPT_VERSION,
      inputHash: params.inputHash,
      bodyMd,
      structuredJson: data as object,
      userId: params.userId ?? null,
      projectId: params.projectId ?? null,
      issueId: params.issueId ?? null,
      sourceType: params.sourceType ?? null,
      sourceId: params.sourceId ?? null,
      milestoneKey: params.milestoneKey ?? null,
      sources: {
        create: sources.map((source, index) => ({
          title: source.title,
          url: source.url ?? null,
          sourceType: source.sourceType,
          note: source.note ?? null,
          excerptMd: source.excerptMd ?? null,
          rank: index
        }))
      }
    },
    include: {
      run: true,
      sources: {
        orderBy: {
          rank: "asc"
        }
      }
    }
  });

  await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: AiMessageRole.ASSISTANT,
      bodyMd,
      structuredJson: data as object
    }
  });

  return envelopeFromArtifact(artifact, params.schema, false);
}

function buildResearchFallback(context: ProjectContext): ResearchResponse {
  const sources = buildProjectSourceCandidates(context);
  const strongestSource = sources[0];
  const evidenceLines = context.content.evidence
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);

  return researchResponseSchema.parse({
    question:
      context.project.essentialQuestion?.trim() ||
      `What is the clearest pattern inside ${context.project.primaryIssue?.title ?? "this issue"}?`,
    coachingNote:
      "Stay on one claim at a time. Tighten the evidence trail before you jump ahead to the recommendation.",
    researchLog: {
      focus: context.project.primaryIssue?.title ?? context.project.title,
      whatWeKnow:
        evidenceLines.length > 0
          ? evidenceLines
          : ["The issue is already real enough to name, but the evidence trail still needs sharper proof."],
      gaps: [
        strongestSource
          ? `Explain why ${strongestSource.title} is one of your strongest sources instead of just another link.`
          : "Add at least one source you can point to directly.",
        "Say which evidence most directly supports your main claim."
      ],
      nextMoves: [
        "Pull out the single strongest fact or comparison from the evidence board.",
        "Write one sentence explaining why that fact changes the reader's understanding of the issue."
      ]
    },
    sources
  });
}

function buildArgumentFallback(context: ProjectContext): ArgumentResponse {
  const evidenceSnippets = [
    context.content.evidence,
    context.content.analysis,
    context.project.findingsMd
  ]
    .flatMap((value) => value.split("\n"))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  return argumentResponseSchema.parse({
    claim:
      context.content.recommendations.trim() ||
      `The league should act on ${context.project.primaryIssue?.title ?? "this issue"} instead of treating it as background noise.`,
    rankedEvidence:
      evidenceSnippets.length > 0
        ? evidenceSnippets
        : ["The current evidence board still needs one stronger fact before the argument can feel earned."],
    counterargument:
      "A skeptical panel could say the evidence is interesting but still too thin, too local, or too descriptive to justify a strong move.",
    rebuttal:
      "The answer is to rank the strongest evidence, explain the pattern plainly, and show why doing nothing is also a real decision.",
    recommendation:
      context.content.recommendations.trim() ||
      "Turn the current evidence into one clear, actionable recommendation the league could actually discuss.",
    coachingNote:
      "Make the recommendation concrete enough that another person could disagree with it directly."
  });
}

function buildAdversaryFallback(context: ProjectContext, readiness: ProjectAiReadiness): AdversaryResponse {
  const evidenceCount = context.references.length;
  const passed =
    readiness.argumentFresh &&
    evidenceCount >= 2 &&
    context.content.analysis.trim().length >= 80 &&
    context.content.recommendations.trim().length >= 40;

  return adversaryResponseSchema.parse({
    passed,
    weakestEvidence:
      evidenceCount > 0
        ? `Right now the evidence trail has ${evidenceCount} cited source${evidenceCount === 1 ? "" : "s"}, but the weakest part is still how the sources connect to the claim.`
        : "You still need sources a panel could inspect.",
    disagreement:
      "A real critic would say the argument is still leaning on momentum and tone more than ranked proof.",
    hardestQuestion:
      "If the league followed your recommendation tomorrow, what is the strongest piece of evidence that proves the change is worth the risk?",
    requiredFixes: passed
      ? [
          "Keep the ranked evidence visible when you move into the build sprint.",
          "Make sure the recommendation stays as specific in the final artifact as it is here."
        ]
      : [
          "Rank the strongest evidence instead of listing it loosely.",
          "State the strongest counterargument in one sentence and answer it directly.",
          "Tighten the recommendation until a panel could vote yes or no on it."
        ],
    coachingNote: passed
      ? "The argument now feels earned enough to survive first contact."
      : "Do not move on yet. The build sprint should only start once the argument can survive a hostile first question.",
    sources: buildProjectSourceCandidates(context).slice(0, 3)
  });
}

function buildWritingFallback(params: {
  context: ProjectContext;
  deliverableKey: string;
  currentDraft: string;
  previousDraft: string;
}): WritingResponse {
  const improved = params.currentDraft.trim().length > params.previousDraft.trim().length;
  return writingResponseSchema.parse({
    overallAssessment:
      params.currentDraft.trim().length >= 140
        ? "The draft has enough substance to coach at the sentence-and-structure level."
        : "The draft is still too thin. Add more substance before polishing the prose.",
    strengths: [
      params.context.project.primaryIssue
        ? `The draft is anchored to ${params.context.project.primaryIssue.title}.`
        : "The draft is anchored to a real project question.",
      improved
        ? "This version is more developed than the last saved snapshot."
        : "The core idea is visible even if the draft still needs more depth."
    ],
    revisionPriorities: [
      "Open with the main point sooner so a reader knows the claim before the explanation expands.",
      "Tie each paragraph back to evidence or a specific decision instead of drifting into summary."
    ],
    lineEdits: [
      "Replace vague phrases like 'this matters' with the exact reason it matters in league terms.",
      "Turn one long paragraph into two shorter moves: evidence first, implication second."
    ],
    comparedToPriorDraft: improved
      ? "The current draft is more complete than the last saved version."
      : "The current draft is not yet meaningfully stronger than the last saved version."
  });
}

function buildQualityFallback(context: ProjectContext, readiness: ProjectAiReadiness): QualityResponse {
  const focus = context.project.artifactFocus ?? ProjectArtifactFocus.RESEARCH;
  const blockers: string[] = [];

  if (!readiness.adversaryPassed) {
    blockers.push("The adversarial mentor has not been cleared for the current evidence and argument state.");
  }

  if (context.project.deliverables.some((deliverable) => !deliverable.complete)) {
    blockers.push("At least one required launch deliverable is still incomplete.");
  }

  if (focus === ProjectArtifactFocus.RESEARCH && context.content.analysis.trim().length < 120) {
    blockers.push("The analysis still reads more like notes than a finished analyst explanation.");
  }

  if (focus === ProjectArtifactFocus.TOOL && !context.project.deliverables.find((item) => item.key === "CORE_BUILD")?.artifactUrl) {
    blockers.push("Tool projects need a visible build output or artifact link.");
  }

  if (focus === ProjectArtifactFocus.STRATEGY && context.content.recommendations.trim().length < 80) {
    blockers.push("Strategy projects need a more concrete recommendation set with moves and risks.");
  }

  const rubricItems = [
    {
      label: "Evidence trail",
      status: context.references.length >= 2 ? "PASS" : "BLOCK",
      detail:
        context.references.length >= 2
          ? "The project has multiple inspectable sources."
          : "Add more cited sources before trying to clear quality."
    },
    {
      label: "Argument durability",
      status: readiness.adversaryPassed ? "PASS" : "BLOCK",
      detail: readiness.adversaryPassed
        ? "The adversarial mentor accepted the current argument."
        : "The adversarial mentor still sees unresolved weak points."
    },
    {
      label: "Launch package completeness",
      status: blockers.some((blocker) => blocker.includes("deliverable")) ? "BLOCK" : "PASS",
      detail: blockers.some((blocker) => blocker.includes("deliverable"))
        ? "Finish the required deliverables before submission."
        : "The launch package is assembled."
    }
  ] as const;

  return qualityResponseSchema.parse({
    passed: blockers.length === 0,
    scoreLabel: blockers.length === 0 ? "Clears the bar" : "Not ready yet",
    rubricItems,
    blockers,
    strengths: blockers.length === 0
      ? [
          "The artifact suite is complete enough to read as a finished campaign package.",
          "The evidence, argument, and launch materials now point in the same direction."
        ]
      : ["The project has a visible structure. The last step is tightening the weak blockers, not rebuilding from zero."]
  });
}

function buildIssueIntelFallback(issue: IssueContext): IssueIntelResponse {
  const gap = classifyIssueWorkGap({
    id: issue.id,
    title: issue.title,
    proposals: issue.proposals,
    projectLinks: issue.projectLinks
  });
  const preview = buildIssueResearchPreview({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    team: issue.team ? { name: issue.team.name } : null,
    metrics: parseIssueMetrics(issue.metricsJson),
    proposals: issue.proposals,
    projectLinks: issue.projectLinks
  });

  return issueIntelResponseSchema.parse({
    whatIsHard: [
      gap.summary,
      issue.team
        ? `${issue.team.name} gives the issue a concrete starting point, but that also means weak projects can get trapped in team detail without reaching the league debate.`
        : "League-wide issues are harder because students need to pick a clear angle instead of trying to cover everything."
    ],
    realDebate: preview.argumentPrompt,
    stakeholders: [
      issue.team?.name ?? "League office",
      "Small-market teams",
      "Big-spending teams",
      "Fans and classroom reviewers"
    ],
    strongProjectLooksLike: [
      "It names the real pressure clearly before proposing a fix.",
      "It uses evidence to explain why the issue matters now, not just in theory.",
      "It makes one recommendation another person could actually debate."
    ],
    weakProjectLooksLike: [
      "It stays broad and descriptive instead of choosing a real claim.",
      "It lists facts without explaining what they prove.",
      "It treats the issue like a generic school topic instead of a live league problem."
    ],
    firstMoves: [preview.questionPrompt, preview.evidencePrompt, preview.nextStepDetail]
  });
}

function buildMissionFallback(userId: string, context: Awaited<ReturnType<typeof loadStudentMissionContext>>): MissionResponse {
  const openProject = context.openProjects[0] ?? null;

  if (openProject) {
    const activeMilestone =
      openProject.milestones.find((milestone) => milestone.status === "ACTIVE") ?? null;
    const stalled = isProjectStalled({
      project: openProject,
      milestoneKey: activeMilestone?.key ?? null
    });
    const readiness = buildProjectMissionAssessment(openProject);

    return missionResponseSchema.parse({
      title: activeMilestone
        ? `Finish ${activeMilestone.title.toLowerCase()}`
        : `Resume ${openProject.title}`,
      body: stalled.stalled
        ? `You have been away from this milestone for ${stalled.daysIdle} days. Reopen the draft and clear the next blocker.`
        : readiness.nextMove,
      reason: activeMilestone
        ? `This keeps ${openProject.title} moving through the active milestone instead of letting the campaign sprawl.`
        : "Your strongest next move is in the draft you already started.",
      ctaLabel: "Open project",
      href: `/projects/${openProject.id}/edit`,
      milestoneKey: activeMilestone?.key ?? null
    });
  }

  const claimedIssueIds = Array.from(
    new Set([
      ...context.openProjects.flatMap((project) => [project.issueId ?? ""]),
      ...context.openProposals.map((proposal) => proposal.issueId)
    ].filter(Boolean))
  );
  const missions = buildRecommendedMissionCandidates({
    issues: context.issues,
    linkedTeamId: context.user?.linkedTeam?.id ?? null,
    claimedIssueIds
  });
  const recommended = missions[0];

  if (recommended) {
    return missionResponseSchema.parse({
      title: `Start ${recommended.issue.title}`,
      body: recommended.reason,
      reason: "There is no stronger current draft competing for attention.",
      ctaLabel: "Start project",
      href: recommended.starterHref,
      milestoneKey: null
    });
  }

  return missionResponseSchema.parse({
    title: "Pick your next mission",
    body: "You are clear to start new work, but the app does not yet see one issue that beats the rest for urgency.",
    reason: "No open draft is pulling you back right now.",
    ctaLabel: "Open mission hub",
    href: "/start",
    milestoneKey: null
  });
}

function buildProjectMissionAssessment(project: Awaited<ReturnType<typeof loadStudentMissionContext>>["openProjects"][number]) {
  const activeMilestone = project.milestones.find((milestone) => milestone.status === "ACTIVE") ?? null;
  const incompleteDeliverable = project.deliverables.find((deliverable) => !deliverable.complete) ?? null;
  return {
    nextMove: activeMilestone
      ? `Open ${activeMilestone.title.toLowerCase()} and finish the next missing item before you jump to later work.`
      : incompleteDeliverable
        ? `Tighten ${incompleteDeliverable.title.toLowerCase()} so the launch package gets closer to complete.`
        : "Reopen the draft and strengthen the next weak section."
  };
}

function buildOrientFallback(context: ProjectContext, assessment: ProjectCampaignAssessment): OrientResponse {
  const activeMilestone =
    assessment.milestones.find((milestone) => milestone.status === "ACTIVE") ?? assessment.milestones[0];
  const completed = assessment.milestones
    .filter((milestone) => milestone.complete)
    .map((milestone) => `${milestone.title} is complete.`);
  const notDone = activeMilestone?.missingItems ?? [];

  return orientResponseSchema.parse({
    title: activeMilestone ? activeMilestone.title : "Project orientation",
    whereYouAre: activeMilestone
      ? `You are in ${activeMilestone.title.toLowerCase()} for ${context.project.title}.`
      : `You are in the campaign workspace for ${context.project.title}.`,
    whyItMatters:
      activeMilestone?.description ??
      "The current milestone is the next gate that keeps the month-long project from turning into a pile of disconnected notes.",
    done: completed.length > 0 ? completed : ["The project has a real mission frame and saved work to build on."],
    notDone: notDone.length > 0 ? notDone : ["This checkpoint is clear enough to move forward when you are ready."],
    nextMove: assessment.nextAction
  });
}

function buildNarrativeFallback(context: ProjectContext, milestoneKey: ProjectMilestoneKey): NarrativeResponse {
  const milestone = context.project.milestones.find((entry) => entry.key === milestoneKey);
  const issueTitle = context.project.primaryIssue?.title ?? "the project issue";

  return narrativeResponseSchema.parse({
    milestoneKey,
    paragraph: `${
      context.project.createdBy.name
    } moved ${context.project.title} through ${
      milestone?.title.toLowerCase() ?? "the current milestone"
    } by tightening the work around ${issueTitle}. The campaign now shows clearer evidence, a more deliberate analytical direction, and a stronger sense of what the final artifact is trying to prove for the league audience.`
  });
}

function buildResearchPrompt(context: ProjectContext, userMessage?: string | null) {
  return [
    `Project title: ${context.project.title}`,
    `Issue: ${context.project.primaryIssue?.title ?? "Not linked yet"}`,
    `Driving question: ${context.project.essentialQuestion ?? "In progress"}`,
    `Evidence notes: ${context.content.evidence || "None yet"}`,
    `References:\n${summarizeSourcesForArtifact(buildProjectSourceCandidates(context)) || "None yet"}`,
    userMessage ? `Student reply: ${userMessage}` : "Student reply: none yet"
  ].join("\n\n");
}

function buildArgumentPrompt(context: ProjectContext, readiness: ProjectAiReadiness) {
  const latestResearch = getLatestArtifact(context.project, AiArtifactKind.RESEARCH_LOG);
  return [
    `Project: ${context.project.title}`,
    `Driving question: ${context.project.essentialQuestion ?? "In progress"}`,
    `Research fresh: ${readiness.researchFresh}`,
    `Latest research log:\n${latestResearch?.bodyMd ?? "No research log yet."}`,
    `Evidence notes:\n${context.content.evidence || "None yet"}`,
    `Analysis:\n${context.content.analysis || "None yet"}`,
    `Recommendation:\n${context.content.recommendations || "None yet"}`
  ].join("\n\n");
}

function buildAdversaryPrompt(context: ProjectContext, readiness: ProjectAiReadiness) {
  const latestArgument = getLatestArtifact(context.project, AiArtifactKind.ARGUMENT_BACKBONE);
  return [
    `Project: ${context.project.title}`,
    `Argument fresh: ${readiness.argumentFresh}`,
    `Latest argument:\n${latestArgument?.bodyMd ?? "No argument yet."}`,
    `References:\n${summarizeSourcesForArtifact(buildProjectSourceCandidates(context)) || "None yet"}`
  ].join("\n\n");
}

function buildWritingPrompt(params: {
  context: ProjectContext;
  deliverableKey: string;
  currentDraft: string;
  previousDraft: string;
}) {
  return [
    `Project: ${params.context.project.title}`,
    `Deliverable: ${params.deliverableKey}`,
    `Current draft:\n${params.currentDraft || "No draft yet."}`,
    `Previous draft:\n${params.previousDraft || "No earlier saved draft."}`
  ].join("\n\n");
}

function buildQualityPrompt(context: ProjectContext, readiness: ProjectAiReadiness) {
  return [
    `Project: ${context.project.title}`,
    `Artifact focus: ${context.project.artifactFocus ?? ProjectArtifactFocus.RESEARCH}`,
    `Adversary passed: ${readiness.adversaryPassed}`,
    `Overview:\n${context.content.overview}`,
    `Evidence:\n${context.content.evidence}`,
    `Analysis:\n${context.content.analysis}`,
    `Recommendation:\n${context.content.recommendations}`,
    `Deliverables:\n${context.project.deliverables
      .map((deliverable) => `${deliverable.key}: ${deliverable.complete ? "complete" : "incomplete"}`)
      .join("\n")}`
  ].join("\n\n");
}

async function logProjectAiGuidance(params: {
  projectId: string;
  milestoneKey: ProjectMilestoneKey | null;
  actorUserId?: string | null;
  title: string;
  body: string;
  metadata?: Prisma.InputJsonObject;
}) {
  await createProjectCampaignAiGuidanceEvent({
    db: prisma,
    projectId: params.projectId,
    milestoneKey: params.milestoneKey,
    actorUserId: params.actorUserId,
    title: params.title,
    body: params.body,
    metadata: params.metadata ?? null
  });
}

export async function syncProjectAiCampaignState(projectId: string) {
  const context = await loadProjectAiContext(projectId);

  if (!context || context.project.scale !== ProjectScale.EXTENDED) {
    return null;
  }

  const readiness = deriveProjectAiReadiness(context);
  const assessment = buildProjectCampaignAssessment({
    scale: context.project.scale,
    artifactFocus: context.project.artifactFocus ?? ProjectArtifactFocus.RESEARCH,
    issueId: context.project.issueId ?? "",
    issueSeverity: context.project.primaryIssue?.severity ?? null,
    title: context.project.title,
    summary: context.project.summary,
    abstract: context.project.abstract ?? context.project.summary,
    essentialQuestion: context.project.essentialQuestion ?? context.content.questionOrMission,
    methodsSummary: context.project.methodsSummary ?? "",
    overview: context.content.overview,
    context: context.content.context,
    evidence: context.content.evidence,
    analysis: context.content.analysis,
    recommendations: context.content.recommendations,
    reflection: context.content.reflection,
    missionGoal: context.project.missionGoal ?? "",
    successCriteria: context.project.successCriteria ?? "",
    targetLaunchDate: context.project.targetLaunchDate ?? null,
    keyTakeaways: [],
    artifactLinks: context.content.artifacts,
    references: context.references,
    laneSections: context.content.laneSections,
    feedbackCount: context.project.feedbackEntries.length,
    milestoneInputs: context.project.milestones.map((milestone) => ({
      key: milestone.key,
      targetDate: milestone.targetDate,
      completionNote: milestone.completionNote
    })),
    deliverableInputs: context.project.deliverables.map((deliverable) => ({
      key: deliverable.key,
      contentMd: deliverable.contentMd,
      artifactUrl: deliverable.artifactUrl
    })),
    aiReadiness: {
      researchFresh: readiness.researchFresh,
      argumentFresh: readiness.argumentFresh,
      adversaryPassed: readiness.adversaryPassed,
      qualityPassed: readiness.qualityPassed
    }
  });

  await syncProjectCampaignState({
    db: prisma,
    projectId: context.project.id,
    scale: context.project.scale,
    assessment
  });

  const stalled = isProjectStalled({
    project: context.project,
    milestoneKey: assessment.activeMilestoneKey
  });

  if (stalled.stalled) {
    await createProjectCampaignStallEvent({
      db: prisma,
      projectId: context.project.id,
      milestoneKey: assessment.activeMilestoneKey,
      actorUserId: context.project.createdByUserId,
      title: "Campaign stall detected",
      body: `No human progress update has been logged on the active milestone for ${stalled.daysIdle} days.`,
      metadata: {
        daysIdle: stalled.daysIdle,
        thresholdDays: STALL_THRESHOLD_DAYS
      }
    });
  }

  await syncProjectMilestoneNarratives(context.project.id);

  return {
    readiness,
    assessment
  };
}

export async function syncProjectMilestoneNarratives(projectId: string) {
  const context = await loadProjectAiContext(projectId);

  if (!context) {
    return [];
  }

  const createdArtifacts: string[] = [];

  for (const milestone of context.project.milestones.filter((entry) => entry.completedAt)) {
    const inputHash = buildAiHash({
      projectId: context.project.id,
      milestoneKey: milestone.key,
      completedAt: milestone.completedAt?.toISOString() ?? null,
      completionNote: milestone.completionNote ?? "",
      deliverables: context.project.deliverables.map((deliverable) => ({
        key: deliverable.key,
        complete: deliverable.complete,
        contentMd: deliverable.contentMd
      }))
    });
    const existing = await findCachedArtifact({
      kind: AiArtifactKind.NARRATIVE,
      inputHash,
      projectId: context.project.id,
      userId: context.project.createdByUserId,
      sourceType: PublicationSourceType.PROJECT,
      sourceId: context.project.id,
      milestoneKey: milestone.key
    });

    if (existing) {
      continue;
    }

    const result = await runArtifactTask({
      kind: AiConversationKind.NARRATIVE,
      artifactKind: AiArtifactKind.NARRATIVE,
      schema: narrativeResponseSchema,
      title: `Milestone narrative for ${context.project.title}`,
      modelClass: "cheap",
      inputHash,
      userId: context.project.createdByUserId,
      projectId: context.project.id,
      issueId: context.project.issueId,
      sourceType: PublicationSourceType.PROJECT,
      sourceId: context.project.id,
      milestoneKey: milestone.key,
      systemPrompt:
        "You are a serious educational analyst. Return JSON only. Keep the narrative grounded in the student's actual work and avoid grades.",
      userPrompt: [
        `Project: ${context.project.title}`,
        `Milestone: ${milestone.title}`,
        `Completion note: ${milestone.completionNote ?? "None recorded."}`,
        `Overview: ${context.content.overview}`,
        `Evidence: ${context.content.evidence}`,
        `Analysis: ${context.content.analysis}`,
        `Recommendation: ${context.content.recommendations}`
      ].join("\n\n"),
      fallback: () => buildNarrativeFallback(context, milestone.key),
      buildBody: narrativeBody
    });

    createdArtifacts.push(result.artifactId);

    await prisma.studentOutcome.updateMany({
      where: {
        userId: context.project.createdByUserId,
        sourceType: PublicationSourceType.PROJECT,
        sourceId: context.project.id
      },
      data: {
        studentSummary: result.data.paragraph
      }
    });
  }

  return createdArtifacts;
}

export async function runProjectResearch(params: {
  userId: string;
  projectId: string;
  userMessage?: string | null;
}) {
  assertAiRateLimit({
    userId: params.userId,
    bucket: "research",
    limit: 10,
    windowMs: 60_000
  });

  const context = await loadProjectAiContext(params.projectId);

  if (!context) {
    throw new Error("Project not found.");
  }

  const inputHash = buildResearchHash(context);
  const result = await runArtifactTask({
    kind: AiConversationKind.RESEARCH,
    artifactKind: AiArtifactKind.RESEARCH_LOG,
    schema: researchResponseSchema,
    title: `Research coach for ${context.project.title}`,
    modelClass: "reasoning",
    inputHash,
    userId: params.userId,
    projectId: context.project.id,
    issueId: context.project.issueId,
    sourceType: PublicationSourceType.PROJECT,
    sourceId: context.project.id,
    milestoneKey: ProjectMilestoneKey.EVIDENCE_BOARD,
    userMessage: params.userMessage ?? null,
    systemPrompt:
      "You are a Socratic research coach for an educational project studio. Return JSON only. Ask one sharp next question, keep the project focused, and prefer primary or official sources already in context.",
    userPrompt: buildResearchPrompt(context, params.userMessage ?? null),
    fallback: () => buildResearchFallback(context),
    buildBody: researchBody,
    extractSources: (data) => data.sources
  });

  await logProjectAiGuidance({
    projectId: context.project.id,
    milestoneKey: ProjectMilestoneKey.EVIDENCE_BOARD,
    actorUserId: params.userId,
    title: "AI research coach updated",
    body: result.data.question,
    metadata: {
      artifactId: result.artifactId
    }
  });

  await syncProjectAiCampaignState(context.project.id);

  return result;
}

export async function runProjectArgument(params: {
  userId: string;
  projectId: string;
}) {
  assertAiRateLimit({
    userId: params.userId,
    bucket: "argument",
    limit: 8,
    windowMs: 60_000
  });

  const context = await loadProjectAiContext(params.projectId);
  if (!context) {
    throw new Error("Project not found.");
  }

  const readiness = deriveProjectAiReadiness(context);
  const result = await runArtifactTask({
    kind: AiConversationKind.ARGUMENT,
    artifactKind: AiArtifactKind.ARGUMENT_BACKBONE,
    schema: argumentResponseSchema,
    title: `Argument architect for ${context.project.title}`,
    modelClass: "reasoning",
    inputHash: buildArgumentHash(context),
    userId: params.userId,
    projectId: context.project.id,
    issueId: context.project.issueId,
    sourceType: PublicationSourceType.PROJECT,
    sourceId: context.project.id,
    milestoneKey: ProjectMilestoneKey.EVIDENCE_BOARD,
    systemPrompt:
      "You are an argument architect. Return JSON only. Force the student to take a real position, rank evidence, state the counterargument, and make a concrete recommendation.",
    userPrompt: buildArgumentPrompt(context, readiness),
    fallback: () => buildArgumentFallback(context),
    buildBody: argumentBody
  });

  await logProjectAiGuidance({
    projectId: context.project.id,
    milestoneKey: ProjectMilestoneKey.EVIDENCE_BOARD,
    actorUserId: params.userId,
    title: "Argument architect updated",
    body: result.data.claim,
    metadata: {
      artifactId: result.artifactId
    }
  });

  await syncProjectAiCampaignState(context.project.id);

  return result;
}

export async function runProjectAdversary(params: {
  userId: string;
  projectId: string;
}) {
  assertAiRateLimit({
    userId: params.userId,
    bucket: "adversary",
    limit: 8,
    windowMs: 60_000
  });

  const context = await loadProjectAiContext(params.projectId);
  if (!context) {
    throw new Error("Project not found.");
  }

  const readiness = deriveProjectAiReadiness(context);
  const result = await runArtifactTask({
    kind: AiConversationKind.ADVERSARY,
    artifactKind: AiArtifactKind.ADVERSARY_REVIEW,
    schema: adversaryResponseSchema,
    title: `Adversarial mentor for ${context.project.title}`,
    modelClass: "reasoning",
    inputHash: buildAdversaryHash(context),
    userId: params.userId,
    projectId: context.project.id,
    issueId: context.project.issueId,
    sourceType: PublicationSourceType.PROJECT,
    sourceId: context.project.id,
    milestoneKey: ProjectMilestoneKey.EVIDENCE_BOARD,
    systemPrompt:
      "You are an adversarial mentor. Return JSON only. Attack the argument fairly, name the weakest evidence, ask the hardest question, and decide whether the student has cleared the bar.",
    userPrompt: buildAdversaryPrompt(context, readiness),
    fallback: () => buildAdversaryFallback(context, readiness),
    buildBody: adversaryBody,
    extractSources: (data) => data.sources
  });

  await logProjectAiGuidance({
    projectId: context.project.id,
    milestoneKey: ProjectMilestoneKey.EVIDENCE_BOARD,
    actorUserId: params.userId,
    title: "Adversarial mentor updated",
    body: result.data.hardestQuestion,
    metadata: {
      artifactId: result.artifactId,
      passed: result.data.passed
    }
  });

  await syncProjectAiCampaignState(context.project.id);

  return result;
}

export async function runProjectWritingCoach(params: {
  userId: string;
  projectId: string;
  deliverableKey: string;
  currentDraft: string;
}) {
  assertAiRateLimit({
    userId: params.userId,
    bucket: "writing",
    limit: 12,
    windowMs: 60_000
  });

  const context = await loadProjectAiContext(params.projectId);
  if (!context) {
    throw new Error("Project not found.");
  }

  const previousDraft =
    context.project.revisions
      .map((revision) => {
        if (!revision.snapshotJson || typeof revision.snapshotJson !== "object") {
          return "";
        }

        const snapshot = revision.snapshotJson as Record<string, unknown>;
        const deliverables = Array.isArray(snapshot.deliverables) ? snapshot.deliverables : [];
        const matched = deliverables.find((entry) => {
          if (!entry || typeof entry !== "object") {
            return false;
          }

          return String((entry as Record<string, unknown>).key ?? "") === params.deliverableKey;
        }) as Record<string, unknown> | undefined;

        return matched ? String(matched.contentMd ?? "").trim() : "";
      })
      .find(Boolean) ?? "";

  const inputHash = buildAiHash({
    projectId: context.project.id,
    deliverableKey: params.deliverableKey,
    currentDraft: sanitizeAiText(params.currentDraft, 8000),
    previousDraft
  });

  const result = await runArtifactTask({
    kind: AiConversationKind.WRITING,
    artifactKind: AiArtifactKind.WRITING_FEEDBACK,
    schema: writingResponseSchema,
    title: `Writing coach for ${context.project.title}`,
    modelClass: "reasoning",
    inputHash,
    userId: params.userId,
    projectId: context.project.id,
    issueId: context.project.issueId,
    sourceType: PublicationSourceType.PROJECT,
    sourceId: context.project.id,
    milestoneKey: ProjectMilestoneKey.BUILD_SPRINT,
    systemPrompt:
      "You are a professional analyst writing coach. Return JSON only. Do not rewrite the full draft. Diagnose the gap between what the student means and what the draft currently says.",
    userPrompt: buildWritingPrompt({
      context,
      deliverableKey: params.deliverableKey,
      currentDraft: sanitizeAiText(params.currentDraft, 8000),
      previousDraft
    }),
    fallback: () =>
      buildWritingFallback({
        context,
        deliverableKey: params.deliverableKey,
        currentDraft: sanitizeAiText(params.currentDraft, 8000),
        previousDraft
      }),
    buildBody: writingBody
  });

  await logProjectAiGuidance({
    projectId: context.project.id,
    milestoneKey: ProjectMilestoneKey.BUILD_SPRINT,
    actorUserId: params.userId,
    title: "Writing coach updated",
    body: result.data.overallAssessment,
    metadata: {
      artifactId: result.artifactId,
      deliverableKey: params.deliverableKey
    }
  });

  return result;
}

export async function runProjectQualityGate(params: {
  userId: string;
  projectId: string;
}) {
  assertAiRateLimit({
    userId: params.userId,
    bucket: "quality",
    limit: 8,
    windowMs: 60_000
  });

  const context = await loadProjectAiContext(params.projectId);
  if (!context) {
    throw new Error("Project not found.");
  }

  const readiness = deriveProjectAiReadiness(context);
  const result = await runArtifactTask({
    kind: AiConversationKind.QUALITY,
    artifactKind: AiArtifactKind.QUALITY_REVIEW,
    schema: qualityResponseSchema,
    title: `Quality gate for ${context.project.title}`,
    modelClass: "reasoning",
    inputHash: buildQualityHash(context),
    userId: params.userId,
    projectId: context.project.id,
    issueId: context.project.issueId,
    sourceType: PublicationSourceType.PROJECT,
    sourceId: context.project.id,
    milestoneKey: ProjectMilestoneKey.LAUNCH_WEEK,
    systemPrompt:
      "You are a quality gate for student project submission. Return JSON only. Use the artifact focus to judge the work, block submission when the package is not strong enough, and explain the blockers specifically.",
    userPrompt: buildQualityPrompt(context, readiness),
    fallback: () => buildQualityFallback(context, readiness),
    buildBody: qualityBody
  });

  await logProjectAiGuidance({
    projectId: context.project.id,
    milestoneKey: ProjectMilestoneKey.LAUNCH_WEEK,
    actorUserId: params.userId,
    title: "Quality gate updated",
    body: result.data.scoreLabel,
    metadata: {
      artifactId: result.artifactId,
      passed: result.data.passed
    }
  });

  await syncProjectAiCampaignState(context.project.id);

  return result;
}

export async function runStudentMission(userId: string) {
  assertAiRateLimit({
    userId,
    bucket: "mission",
    limit: 20,
    windowMs: 60_000
  });

  const context = await loadStudentMissionContext(userId);
  const openProject = context.openProjects[0] ?? null;
  const inputHash = buildAiHash({
    userId,
    dayKey: new Date().toISOString().slice(0, 10),
    openProjectId: openProject?.id ?? null,
    openProposalId: context.openProposals[0]?.id ?? null,
    issues: context.issues.slice(0, 3).map((issue) => issue.id)
  });

  return runArtifactTask({
    kind: AiConversationKind.MISSION,
    artifactKind: AiArtifactKind.DAILY_MISSION,
    schema: missionResponseSchema,
    title: "Daily mission",
    modelClass: "cheap",
    inputHash,
    userId,
    projectId: openProject?.id ?? null,
    issueId: openProject?.issueId ?? null,
    sourceType: openProject ? PublicationSourceType.PROJECT : null,
    sourceId: openProject?.id ?? null,
    milestoneKey:
      openProject?.milestones.find((milestone) => milestone.status === "ACTIVE")?.key ?? null,
    systemPrompt:
      "You are a daily micro-mission coach. Return JSON only. Give the student exactly one concrete next task for today.",
    userPrompt: `User: ${context.user?.name ?? "Student"}`,
    fallback: () => buildMissionFallback(userId, context),
    buildBody: missionBody
  });
}

export async function runStudentOrient(params: {
  userId: string;
  projectId: string;
}) {
  assertAiRateLimit({
    userId: params.userId,
    bucket: "orient",
    limit: 16,
    windowMs: 60_000
  });

  const syncResult = await syncProjectAiCampaignState(params.projectId);
  const context = await loadProjectAiContext(params.projectId);

  if (!context || !syncResult) {
    throw new Error("Project not found.");
  }

  const result = await runArtifactTask({
    kind: AiConversationKind.ORIENT,
    artifactKind: AiArtifactKind.ORIENTATION,
    schema: orientResponseSchema,
    title: `Orientation for ${context.project.title}`,
    modelClass: "cheap",
    inputHash: buildAiHash({
      projectId: context.project.id,
      assessment: syncResult.assessment,
      stall: isProjectStalled({
        project: context.project,
        milestoneKey: syncResult.assessment.activeMilestoneKey
      })
    }),
    userId: params.userId,
    projectId: context.project.id,
    issueId: context.project.issueId,
    sourceType: PublicationSourceType.PROJECT,
    sourceId: context.project.id,
    milestoneKey: syncResult.assessment.activeMilestoneKey,
    systemPrompt:
      "You are a student orientation coach. Return JSON only. Explain where the student is, why it matters, what is done, what is not done, and the single next move.",
    userPrompt: `Project: ${context.project.title}`,
    fallback: () => buildOrientFallback(context, syncResult.assessment),
    buildBody: orientBody
  });

  await logProjectAiGuidance({
    projectId: context.project.id,
    milestoneKey: syncResult.assessment.activeMilestoneKey,
    actorUserId: params.userId,
    title: "Orientation updated",
    body: result.data.nextMove,
    metadata: {
      artifactId: result.artifactId
    }
  });

  return result;
}

export async function runIssueIntel(params: {
  userId: string;
  issueId: string;
}) {
  assertAiRateLimit({
    userId: params.userId,
    bucket: "issue-intel",
    limit: 20,
    windowMs: 60_000
  });

  const issue = await loadIssueAiContext(params.issueId);

  if (!issue) {
    throw new Error("Issue not found.");
  }

  return runArtifactTask({
    kind: AiConversationKind.ISSUE_INTEL,
    artifactKind: AiArtifactKind.ISSUE_INTELLIGENCE,
    schema: issueIntelResponseSchema,
    title: `Issue intelligence for ${issue.title}`,
    modelClass: "cheap",
    inputHash: buildAiHash({
      issueId: issue.id,
      updatedAt: issue.updatedAt.toISOString(),
      severity: issue.severity,
      proposalCount: issue.proposals.length,
      projectCount: issue.projectLinks.length
    }),
    userId: params.userId,
    issueId: issue.id,
    systemPrompt:
      "You are an issue intelligence briefer. Return JSON only. Explain what is hard about the issue, the real debate, the stakeholders, and what strong versus weak work usually looks like.",
    userPrompt: `${issue.title}\n\n${issue.description}`,
    fallback: () => buildIssueIntelFallback(issue),
    buildBody: issueIntelBody
  });
}

export async function runProjectTeamPulse(params: {
  userId: string;
  projectId: string;
}) {
  assertAiRateLimit({
    userId: params.userId,
    bucket: "team-pulse",
    limit: 12,
    windowMs: 60_000
  });

  const context = await loadProjectAiContext(params.projectId);
  if (!context) {
    throw new Error("Project not found.");
  }

  const pulse = deriveTeamPulse({
    project: context.project,
    activeMilestoneKey: context.activeMilestone?.key ?? null
  });

  const result = await runArtifactTask({
    kind: AiConversationKind.TEAM_PULSE,
    artifactKind: AiArtifactKind.TEAM_PULSE,
    schema: teamPulseResponseSchema,
    title: `Team pulse for ${context.project.title}`,
    modelClass: "cheap",
    inputHash: buildAiHash({
      projectId: context.project.id,
      activeMilestoneKey: context.activeMilestone?.key ?? null,
      contributions: pulse.contributions,
      findings: pulse.findings
    }),
    userId: params.userId,
    projectId: context.project.id,
    issueId: context.project.issueId,
    sourceType: PublicationSourceType.PROJECT,
    sourceId: context.project.id,
    milestoneKey: context.activeMilestone?.key ?? null,
    systemPrompt:
      "You are a team dynamics coach. Return JSON only. Summarize the team state and give one prompt the team should act on together.",
    userPrompt: teamPulseBody(pulse),
    fallback: () => pulse,
    buildBody: teamPulseBody
  });

  if (result.data.unresolved) {
    await createProjectCampaignTeamPulseEvent({
      db: prisma,
      projectId: context.project.id,
      milestoneKey: context.activeMilestone?.key ?? null,
      actorUserId: params.userId,
      title: "Team pulse needs attention",
      body: result.data.prompt,
      metadata: {
        artifactId: result.artifactId,
        status: result.data.status
      }
    });
  }

  return result;
}

export async function runProjectNarrative(params: {
  userId: string;
  projectId: string;
  milestoneKey: ProjectMilestoneKey;
}) {
  assertAiRateLimit({
    userId: params.userId,
    bucket: "narrative",
    limit: 12,
    windowMs: 60_000
  });

  const context = await loadProjectAiContext(params.projectId);
  if (!context) {
    throw new Error("Project not found.");
  }

  const milestone = context.project.milestones.find((entry) => entry.key === params.milestoneKey);

  if (!milestone?.completedAt) {
    throw new Error("That milestone is not complete yet.");
  }

  const result = await runArtifactTask({
    kind: AiConversationKind.NARRATIVE,
    artifactKind: AiArtifactKind.NARRATIVE,
    schema: narrativeResponseSchema,
    title: `Narrative for ${context.project.title}`,
    modelClass: "cheap",
    inputHash: buildAiHash({
      projectId: context.project.id,
      milestoneKey: params.milestoneKey,
      completedAt: milestone.completedAt.toISOString()
    }),
    userId: params.userId,
    projectId: context.project.id,
    issueId: context.project.issueId,
    sourceType: PublicationSourceType.PROJECT,
    sourceId: context.project.id,
    milestoneKey: params.milestoneKey,
    systemPrompt:
      "You are a serious analyst summarizing student progress. Return JSON only and keep the paragraph grounded in the work that was actually completed.",
    userPrompt: `${context.project.title}\n${milestone.title}`,
    fallback: () => buildNarrativeFallback(context, params.milestoneKey),
    buildBody: narrativeBody
  });

  await prisma.studentOutcome.updateMany({
    where: {
      userId: context.project.createdByUserId,
      sourceType: PublicationSourceType.PROJECT,
      sourceId: context.project.id
    },
    data: {
      studentSummary: result.data.paragraph
    }
  });

  return result;
}
