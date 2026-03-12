import { ProjectMilestoneKey } from "@prisma/client";
import { z } from "zod";

export const AI_PROMPT_VERSION = "v1";

export const aiSourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url().nullable().optional(),
  sourceType: z.string().min(1).default("OTHER"),
  note: z.string().min(1).optional(),
  excerptMd: z.string().min(1).optional()
});

export const researchLogSchema = z.object({
  focus: z.string().min(1),
  whatWeKnow: z.array(z.string().min(1)).default([]),
  gaps: z.array(z.string().min(1)).default([]),
  nextMoves: z.array(z.string().min(1)).default([])
});

export const researchResponseSchema = z.object({
  question: z.string().min(1),
  coachingNote: z.string().min(1),
  researchLog: researchLogSchema,
  sources: z.array(aiSourceSchema).default([])
});

export const argumentResponseSchema = z.object({
  claim: z.string().min(1),
  rankedEvidence: z.array(z.string().min(1)).default([]),
  counterargument: z.string().min(1),
  rebuttal: z.string().min(1),
  recommendation: z.string().min(1),
  coachingNote: z.string().min(1)
});

export const adversaryResponseSchema = z.object({
  passed: z.boolean(),
  weakestEvidence: z.string().min(1),
  disagreement: z.string().min(1),
  hardestQuestion: z.string().min(1),
  requiredFixes: z.array(z.string().min(1)).default([]),
  coachingNote: z.string().min(1),
  sources: z.array(aiSourceSchema).default([])
});

export const writingResponseSchema = z.object({
  overallAssessment: z.string().min(1),
  strengths: z.array(z.string().min(1)).default([]),
  revisionPriorities: z.array(z.string().min(1)).default([]),
  lineEdits: z.array(z.string().min(1)).default([]),
  comparedToPriorDraft: z.string().min(1)
});

export const qualityRubricItemSchema = z.object({
  label: z.string().min(1),
  status: z.enum(["PASS", "WARN", "BLOCK"]),
  detail: z.string().min(1)
});

export const qualityResponseSchema = z.object({
  passed: z.boolean(),
  scoreLabel: z.string().min(1),
  rubricItems: z.array(qualityRubricItemSchema).default([]),
  blockers: z.array(z.string().min(1)).default([]),
  strengths: z.array(z.string().min(1)).default([])
});

export const missionResponseSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  reason: z.string().min(1),
  ctaLabel: z.string().min(1),
  href: z.string().min(1),
  milestoneKey: z.nativeEnum(ProjectMilestoneKey).nullable().optional()
});

export const orientResponseSchema = z.object({
  title: z.string().min(1),
  whereYouAre: z.string().min(1),
  whyItMatters: z.string().min(1),
  done: z.array(z.string().min(1)).default([]),
  notDone: z.array(z.string().min(1)).default([]),
  nextMove: z.string().min(1)
});

export const issueIntelResponseSchema = z.object({
  whatIsHard: z.array(z.string().min(1)).default([]),
  realDebate: z.string().min(1),
  stakeholders: z.array(z.string().min(1)).default([]),
  strongProjectLooksLike: z.array(z.string().min(1)).default([]),
  weakProjectLooksLike: z.array(z.string().min(1)).default([]),
  firstMoves: z.array(z.string().min(1)).default([])
});

export const teamPulseContributionSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  activityCount: z.number().int().nonnegative(),
  share: z.number().min(0).max(1)
});

export const teamPulseResponseSchema = z.object({
  status: z.enum(["healthy", "watch", "risk"]),
  prompt: z.string().min(1),
  findings: z.array(z.string().min(1)).default([]),
  contributions: z.array(teamPulseContributionSchema).default([]),
  unresolved: z.boolean()
});

export const narrativeResponseSchema = z.object({
  milestoneKey: z.nativeEnum(ProjectMilestoneKey),
  paragraph: z.string().min(1)
});

export type AiSource = z.infer<typeof aiSourceSchema>;
export type ResearchResponse = z.infer<typeof researchResponseSchema>;
export type ArgumentResponse = z.infer<typeof argumentResponseSchema>;
export type AdversaryResponse = z.infer<typeof adversaryResponseSchema>;
export type WritingResponse = z.infer<typeof writingResponseSchema>;
export type QualityResponse = z.infer<typeof qualityResponseSchema>;
export type MissionResponse = z.infer<typeof missionResponseSchema>;
export type OrientResponse = z.infer<typeof orientResponseSchema>;
export type IssueIntelResponse = z.infer<typeof issueIntelResponseSchema>;
export type TeamPulseResponse = z.infer<typeof teamPulseResponseSchema>;
export type NarrativeResponse = z.infer<typeof narrativeResponseSchema>;

export type AiArtifactEnvelope<T> = {
  artifactId: string;
  conversationId: string | null;
  cached: boolean;
  provider: string;
  model: string;
  promptVersion: string;
  bodyMd: string;
  sources: AiSource[];
  data: T;
};
