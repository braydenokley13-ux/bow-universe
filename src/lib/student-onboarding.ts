import { GradeBand, type Prisma } from "@prisma/client";

import type { RecommendedMission } from "@/lib/student-flow";
import type { LaneTag } from "@/lib/types";

export const CURRENT_STUDENT_ONBOARDING_VERSION = 1;

export const studentOnboardingStepIds = [
  "welcome",
  "universe",
  "problems",
  "work",
  "mission"
] as const;

export type StudentOnboardingStepId = (typeof studentOnboardingStepIds)[number];

export type StudentOnboardingProgress = {
  currentStep: StudentOnboardingStepId;
  selectedGradeBand: GradeBand | null;
  selectedMissionId: string | null;
  selectedLane: LaneTag | null;
};

export type StudentOnboardingStats = {
  newsCount: number;
  openIssuesCount: number;
  openChallengesCount: number;
  publicationCount: number;
  teamCount: number;
  glossaryCount: number;
};

export type StudentOnboardingData = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  linkedTeam: { id: string; name: string } | null;
  gradeBand: GradeBand | null;
  onboardingCompletedAt: Date | null;
  onboardingExperienceVersion: number;
  progress: StudentOnboardingProgress | null;
  hasSubmittedFirstProject: boolean;
  hasOpenProjectOrProposal: boolean;
  isRevisit: boolean;
  missionCandidates: RecommendedMission[];
  stats: StudentOnboardingStats;
};

export type StudentTourCard = {
  id: string;
  title: string;
  href: string;
  summary: string;
  whyItMatters: string;
  timing: "use_now" | "use_later";
  statLabel: string;
  statValue: string;
};

const validGradeBands = new Set<GradeBand>(Object.values(GradeBand));
const validLanes = new Set<LaneTag>([
  "TOOL_BUILDERS",
  "POLICY_REFORM_ARCHITECTS",
  "STRATEGIC_OPERATORS",
  "ECONOMIC_INVESTIGATORS"
]);
const validSteps = new Set<StudentOnboardingStepId>(studentOnboardingStepIds);

function asRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Prisma.JsonObject;
}

function asString(value: Prisma.JsonValue | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function parseStudentOnboardingProgress(
  value: Prisma.JsonValue | null | undefined
): StudentOnboardingProgress | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const currentStepValue = asString(record.currentStep);
  const gradeBandValue = asString(record.selectedGradeBand);
  const missionId = asString(record.selectedMissionId);
  const laneValue = asString(record.selectedLane);

  if (!currentStepValue || !validSteps.has(currentStepValue as StudentOnboardingStepId)) {
    return null;
  }

  return {
    currentStep: currentStepValue as StudentOnboardingStepId,
    selectedGradeBand:
      gradeBandValue && validGradeBands.has(gradeBandValue as GradeBand)
        ? (gradeBandValue as GradeBand)
        : null,
    selectedMissionId: missionId,
    selectedLane:
      laneValue && validLanes.has(laneValue as LaneTag) ? (laneValue as LaneTag) : null
  };
}

export function shouldForceStudentOnboarding(input: {
  role: "STUDENT" | "ADMIN" | null | undefined;
  onboardingExperienceVersion: number | null | undefined;
  hasSubmittedFirstProject: boolean;
  hasOpenProjectOrProposal: boolean;
}) {
  return (
    input.role === "STUDENT" &&
    (input.onboardingExperienceVersion ?? 0) < CURRENT_STUDENT_ONBOARDING_VERSION &&
    !input.hasSubmittedFirstProject &&
    !input.hasOpenProjectOrProposal
  );
}

export function buildUniversePreviewCards(input: {
  gradeBand: GradeBand | null;
  stats: StudentOnboardingStats;
}) {
  const rulesTiming = input.gradeBand === "GRADE_5_6" ? "use_later" : "use_now";

  return [
    {
      id: "home",
      title: "Home",
      href: "/",
      summary: "This is mission control. It tells you what needs attention and what your best next move is.",
      whyItMatters: "You should not have to guess where to go when class starts.",
      timing: "use_now" as const,
      statLabel: "Live feed",
      statValue: `${input.stats.newsCount} updates`
    },
    {
      id: "news",
      title: "News",
      href: "/news",
      summary: "This is the league newsroom. It shows what changed and why people in the universe care.",
      whyItMatters: "It helps the world feel active instead of frozen.",
      timing: "use_now" as const,
      statLabel: "Stories",
      statValue: `${input.stats.newsCount}`
    },
    {
      id: "teams",
      title: "Teams",
      href: "/teams",
      summary: "This is the team index. It shows who each franchise is, what kind of market it has, and how money pressure changes its choices.",
      whyItMatters: "A real team anchor makes league problems easier to understand.",
      timing: "use_now" as const,
      statLabel: "Teams",
      statValue: `${input.stats.teamCount}`
    },
    {
      id: "rules",
      title: "Rules",
      href: "/rules",
      summary: "This is the rulebook. It explains the active money system the whole universe is using right now.",
      whyItMatters: "Projects and proposals make more sense when you know the rule environment underneath them.",
      timing: rulesTiming,
      statLabel: "When to use",
      statValue: rulesTiming === "use_now" ? "Use now" : "Use later"
    },
    {
      id: "glossary",
      title: "Glossary",
      href: "/glossary",
      summary: "This is the word bank. It turns league and economics vocabulary into student-friendly definitions.",
      whyItMatters: "You can get unstuck fast without leaving the app.",
      timing: "use_now" as const,
      statLabel: "Terms",
      statValue: `${input.stats.glossaryCount}`
    }
  ] satisfies StudentTourCard[];
}

export function buildWorkPreviewCards(input: {
  gradeBand: GradeBand | null;
  hasSubmittedFirstProject: boolean;
  stats: StudentOnboardingStats;
}) {
  const advancedTiming = input.hasSubmittedFirstProject ? "use_now" : "use_later";
  const portfolioTiming =
    input.gradeBand === "GRADE_5_6" && !input.hasSubmittedFirstProject ? "use_later" : "use_now";

  return [
    {
      id: "projects",
      title: "Projects",
      href: "/projects",
      summary: "This is where your research work starts. The beginner project flow turns one issue into small, manageable questions.",
      whyItMatters: "Your first win should come from real work, not from wandering around the universe.",
      timing: "use_now" as const,
      statLabel: "Start here",
      statValue: "First project"
    },
    {
      id: "proposals",
      title: "Proposals",
      href: "/proposals",
      summary: "This is the memo path for changing league rules in a formal way.",
      whyItMatters: "It builds on project evidence, so it should feel like a next step instead of a first step.",
      timing: advancedTiming,
      statLabel: "When to use",
      statValue: advancedTiming === "use_now" ? "Unlocked" : "After project one"
    },
    {
      id: "challenges",
      title: "Challenges",
      href: "/challenges",
      summary: "This is the competition board for research that is already strong enough to enter.",
      whyItMatters: "Competition works better after you already know how the classroom workflow feels.",
      timing: advancedTiming,
      statLabel: "Open now",
      statValue: `${input.stats.openChallengesCount}`
    },
    {
      id: "research",
      title: "Research",
      href: "/research",
      summary: "This is the archive of polished work that made it through review and publication.",
      whyItMatters: "Published examples help later, but they should not stop you from starting your own draft.",
      timing: advancedTiming,
      statLabel: "Archive",
      statValue: `${input.stats.publicationCount} pieces`
    },
    {
      id: "portfolio",
      title: "Portfolio",
      href: "/students/me",
      summary: "This is your own long-view record of drafts, feedback, publications, and growth.",
      whyItMatters: "It shows what you have already built and what still needs attention.",
      timing: portfolioTiming,
      statLabel: "When to use",
      statValue: portfolioTiming === "use_now" ? "Use now" : "After your first draft"
    }
  ] satisfies StudentTourCard[];
}
