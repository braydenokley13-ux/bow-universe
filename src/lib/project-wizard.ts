import { ProjectType } from "@prisma/client";

import type {
  CoachFieldState,
  CoachStepStatus
} from "@/lib/coach-ui";
import { getLaneTemplate } from "@/lib/publications";
import type {
  ArtifactLink,
  LaneSectionEntry,
  LaneTag,
  ReferenceEntry
} from "@/lib/types";
import { parseStringList } from "@/lib/utils";

export type ProjectCoachStepId =
  | "lane"
  | "context"
  | "opening"
  | "mission"
  | "body"
  | "laneSections"
  | "publish"
  | "review";

export type ProjectCoachFieldId =
  | "lanePrimary"
  | "projectType"
  | "laneTags"
  | "issueId"
  | "teamId"
  | "supportingProposalId"
  | "collaboratorIds"
  | "title"
  | "summary"
  | "abstract"
  | "essentialQuestion"
  | "methodsSummary"
  | "overview"
  | "context"
  | "evidence"
  | "analysis"
  | "recommendations"
  | "laneSections"
  | "artifactLinks"
  | "references"
  | "keywords"
  | "keyTakeaways"
  | "publicationSlug"
  | "reflection"
  | "findingsMd";

export type ProjectCoachValues = {
  lanePrimary: LaneTag;
  projectType: ProjectType;
  laneTags: LaneTag[];
  issueId: string;
  teamId: string;
  supportingProposalId: string;
  collaboratorIds: string[];
  title: string;
  summary: string;
  abstract: string;
  essentialQuestion: string;
  methodsSummary: string;
  publicationSlug: string;
  findingsMd: string;
  overview: string;
  context: string;
  evidence: string;
  analysis: string;
  recommendations: string;
  reflection: string;
  artifactLinks: string;
  references: string;
  keywords: string;
  keyTakeaways: string;
  laneSections: LaneSectionEntry[];
};

export type ProjectCoachLaneSectionStore = Record<LaneTag, LaneSectionEntry[]>;

export type ProjectCoachFieldEvaluation = {
  fieldId: ProjectCoachFieldId;
  label: string;
  stepId: ProjectCoachStepId;
  required: boolean;
  state: CoachFieldState;
  complete: boolean;
  message: string;
  nextMove: string;
  recipe: string[];
  starters: string[];
  missingIngredients: string[];
  weakExample: string;
  strongExample: string;
};

export type ProjectCoachLaneSectionEvaluation = {
  key: string;
  label: string;
  state: CoachFieldState;
  complete: boolean;
  message: string;
  nextMove: string;
  recipe: string[];
  starters: string[];
  missingIngredients: string[];
  weakExample: string;
  strongExample: string;
};

export type ProjectCoachStepDefinition = {
  id: ProjectCoachStepId;
  shortTitle: string;
  title: string;
  fieldIds: ProjectCoachFieldId[];
  requiredFieldIds: ProjectCoachFieldId[];
  rightNow: string;
  whyItMatters: string;
  recipe: string[];
  starters: string[];
  weakExample: string;
  strongExample: string;
};

export type ProjectCoachStepEvaluation = {
  stepId: ProjectCoachStepId;
  title: string;
  status: CoachStepStatus;
  complete: boolean;
  missingItems: string[];
  nextMove: string;
  hasAnyContent: boolean;
};

export type ProjectCoachReviewBucket = {
  title: string;
  items: string[];
};

export type ProjectCoachAssessment = {
  fields: Record<ProjectCoachFieldId, ProjectCoachFieldEvaluation>;
  laneSectionEvaluations: ProjectCoachLaneSectionEvaluation[];
  steps: Record<ProjectCoachStepId, ProjectCoachStepEvaluation>;
  stepOrder: ProjectCoachStepId[];
  firstIncompleteStepId: ProjectCoachStepId;
  nextAction: string;
  submitReady: boolean;
  reviewBuckets: {
    blockers: ProjectCoachReviewBucket;
    polish: ProjectCoachReviewBucket;
    strengths: ProjectCoachReviewBucket;
  };
};

export type ProjectCoachAssessmentOptions = {
  issueRequired?: boolean;
};

type FieldConfig = {
  id: ProjectCoachFieldId;
  label: string;
  stepId: ProjectCoachStepId;
  required: boolean;
  recipe: string[];
  starters: string[];
  weakExample: string;
  strongExample: string;
};

const actionVerbPattern =
  /\b(build|compare|show|explain|test|trace|recommend|plan|protect|raise|lower|design|study|investigate|diagnose|measure|predict|map)\b/i;
const evidencePattern =
  /\b(data|record|records|source|sources|observation|observations|evidence|dataset|interview|sandbox|league)\b/i;
const meaningPattern =
  /\b(because|means|shows|suggests|therefore|pattern|pressure|risk|tradeoff|outcome|why)\b/i;
const questionPattern = /\b(how|why|what|which|should|does|can|mission|goal)\b/i;

export const projectCoachStepOrder: ProjectCoachStepId[] = [
  "lane",
  "context",
  "opening",
  "mission",
  "body",
  "laneSections",
  "publish",
  "review"
];

const laneOrder: LaneTag[] = [
  "TOOL_BUILDERS",
  "POLICY_REFORM_ARCHITECTS",
  "STRATEGIC_OPERATORS",
  "ECONOMIC_INVESTIGATORS"
];

const fieldConfigs: Record<ProjectCoachFieldId, FieldConfig> = {
  lanePrimary: {
    id: "lanePrimary",
    label: "Primary lane",
    stepId: "lane",
    required: true,
    recipe: [
      "Choose the lane that matches the real job of the project.",
      "Treat the lane like the publishing format, not just a label.",
      "Pick the lane before you write the body so the prompts stay aligned."
    ],
    starters: [],
    weakExample: "Pick a lane later.",
    strongExample: "Choose the lane first so the project knows which publication shape it is building."
  },
  projectType: {
    id: "projectType",
    label: "Project type",
    stepId: "lane",
    required: true,
    recipe: [
      "Match the type to the work you are actually building.",
      "Keep the type consistent with the lane.",
      "Use the type to clarify whether this is a tool, investigation, strategy, or proposal support record."
    ],
    starters: [],
    weakExample: "Use any type.",
    strongExample: "Choose the type that matches the publication you want to publish later."
  },
  laneTags: {
    id: "laneTags",
    label: "Lane tags",
    stepId: "lane",
    required: false,
    recipe: [
      "Keep the primary lane checked.",
      "Add extra lanes only if they truly help describe the work.",
      "Use tags to describe overlap, not confusion."
    ],
    starters: [],
    weakExample: "Check every lane.",
    strongExample: "Keep the primary lane and add only one extra lane if the work genuinely overlaps."
  },
  issueId: {
    id: "issueId",
    label: "Primary issue",
    stepId: "context",
    required: false,
    recipe: [
      "Pick the one league issue this project is mainly trying to help.",
      "Keep one issue visible so the project does not drift into a vague school assignment.",
      "Leave it empty only when the project truly stands alone."
    ],
    starters: [],
    weakExample: "A project with no clear issue anchor.",
    strongExample: "Choose the one issue that best explains why this project matters right now."
  },
  teamId: {
    id: "teamId",
    label: "Linked team",
    stepId: "context",
    required: false,
    recipe: [
      "Link a team when the project studies or plans around a specific club.",
      "Use the team field to ground strategy work.",
      "Leave it empty if the project is truly league-wide."
    ],
    starters: [],
    weakExample: "Pick a team randomly.",
    strongExample: "Link the team only when the work is genuinely about that franchise."
  },
  supportingProposalId: {
    id: "supportingProposalId",
    label: "Supporting proposal",
    stepId: "context",
    required: false,
    recipe: [
      "Link a proposal if this project supports or tests one.",
      "Use the supporting proposal to show what decision the project informs.",
      "Leave it empty if the project stands alone."
    ],
    starters: [],
    weakExample: "Link a proposal just to fill the space.",
    strongExample: "Link the proposal only if the project gives evidence or strategy for it."
  },
  collaboratorIds: {
    id: "collaboratorIds",
    label: "Collaborators",
    stepId: "context",
    required: false,
    recipe: [
      "Add collaborators only if they are really contributing.",
      "Use collaborators to share credit and editing access.",
      "Leave it empty if this is solo work."
    ],
    starters: [],
    weakExample: "Add everyone.",
    strongExample: "Add only the teammates who actually shaped the work."
  },
  title: {
    id: "title",
    label: "Title",
    stepId: "opening",
    required: true,
    recipe: [
      "Name the exact project or question.",
      "Help a new reader understand the subject immediately.",
      "Make the title specific enough to stand on its own."
    ],
    starters: [
      "How the second apron changes small-market flexibility",
      "A planning tool for comparing revenue sharing outcomes",
      "A three-year strategy for rebuilding without losing optionality"
    ],
    weakExample: "Project draft",
    strongExample: "How the second apron changes small-market flexibility"
  },
  summary: {
    id: "summary",
    label: "Short summary",
    stepId: "opening",
    required: true,
    recipe: [
      "Explain the project in one or two calm sentences.",
      "Name the subject, method, and purpose quickly.",
      "Treat the summary like the fastest introduction possible."
    ],
    starters: [
      "This project studies [question] by using [evidence or method] so readers can understand [main purpose].",
      "This brief explains [topic], shows [evidence], and argues that [main takeaway]."
    ],
    weakExample: "This is my project.",
    strongExample:
      "This project studies how spending pressure changes small-market flexibility by comparing league conditions and tracing where teams lose room to plan."
  },
  abstract: {
    id: "abstract",
    label: "Abstract",
    stepId: "opening",
    required: true,
    recipe: [
      "Name the question or mission.",
      "Name the evidence or method.",
      "Name the main finding or output."
    ],
    starters: [
      "This project asks [question]. It uses [evidence or method] to study [topic]. It finds that [main result].",
      "This publication explains [topic], traces [evidence], and concludes that [main meaning]."
    ],
    weakExample: "This project is about the league.",
    strongExample:
      "This project asks whether smaller markets lose long-term flexibility faster once tax pressure rises. It uses league records and comparison logic to trace the pressure. It finds that the constraint is not just spending level, but how spending tools disappear."
  },
  essentialQuestion: {
    id: "essentialQuestion",
    label: "Question or mission",
    stepId: "mission",
    required: true,
    recipe: [
      "State the question or mission in one clear line.",
      "Make it specific enough that the body can actually answer it.",
      "Use language that fits the lane: question, design mission, or strategy objective."
    ],
    starters: [
      "How does [league pattern] change once [pressure point] rises?",
      "This tool is designed to help readers compare [decision] across [inputs].",
      "The mission of this strategy dossier is to map how [team] can move from [state] to [goal]."
    ],
    weakExample: "I want to learn more about this topic.",
    strongExample: "How does the second apron change planning freedom for small-market teams?"
  },
  methodsSummary: {
    id: "methodsSummary",
    label: "Methods summary",
    stepId: "mission",
    required: true,
    recipe: [
      "Tell the reader how the work was investigated or built.",
      "Mention the records, comparisons, or design steps you used.",
      "Keep the method concrete enough that the reader trusts the project."
    ],
    starters: [
      "I studied this by comparing [records or cases], noting [pattern], and checking how the pressure changed across situations.",
      "I built this by defining the inputs, testing the steps, and showing what output a reader would receive."
    ],
    weakExample: "I worked on it for a while.",
    strongExample:
      "I studied this by comparing league conditions across different pressure levels, tracing where tools disappeared, and writing the pattern in plain language."
  },
  overview: {
    id: "overview",
    label: "Overview",
    stepId: "body",
    required: true,
    recipe: [
      "Open with the main point first.",
      "Tell the reader where the publication is going.",
      "Keep it calm, clear, and directional."
    ],
    starters: [
      "The main thing readers should understand is that [main point].",
      "This publication argues that [main claim], and the rest of the brief shows why."
    ],
    weakExample: "There are many things to discuss here.",
    strongExample: "The main point is that spending pressure changes planning freedom long before a team is completely trapped."
  },
  context: {
    id: "context",
    label: "Context",
    stepId: "body",
    required: false,
    recipe: [
      "Give the reader the background they need before the evidence begins.",
      "Define BOW-specific ideas early.",
      "Use context to orient, not to repeat the whole project."
    ],
    starters: [
      "Before the findings make sense, readers need to know that [background].",
      "In the BOW Universe, this matters because [league context]."
    ],
    weakExample: "There is some background here.",
    strongExample: "Before the findings make sense, readers need to know that the BOW cap system removes tools gradually, so the pressure arrives before teams hit their hardest limit."
  },
  evidence: {
    id: "evidence",
    label: "Evidence",
    stepId: "body",
    required: true,
    recipe: [
      "Name the records, examples, or inputs you used.",
      "Show what the evidence is, not only the opinion.",
      "Be concrete enough that another reader could follow the trail."
    ],
    starters: [
      "The main evidence comes from [records, observations, tool outputs, or comparisons].",
      "I used [source] to show [pattern], because it captures [reason]."
    ],
    weakExample: "I used some information.",
    strongExample:
      "The main evidence comes from league records, payroll pressure examples, and comparisons between what teams could do before and after key constraints appeared."
  },
  analysis: {
    id: "analysis",
    label: "Analysis",
    stepId: "body",
    required: true,
    recipe: [
      "Explain what the evidence means.",
      "Show the pattern, mechanism, or tension behind the evidence.",
      "Do more than summarize; interpret."
    ],
    starters: [
      "The important pattern is that [pattern], which matters because [meaning].",
      "This evidence suggests [meaning], not just [surface fact]."
    ],
    weakExample: "The evidence is interesting.",
    strongExample:
      "The important pattern is that teams lose planning freedom before they lose spending desire, which means the system changes behavior earlier than a simple payroll snapshot would suggest."
  },
  recommendations: {
    id: "recommendations",
    label: "Recommendation",
    stepId: "body",
    required: true,
    recipe: [
      "End with a clear action or next step.",
      "Say what the reader should do, build, test, or rethink next.",
      "Treat the recommendation like the payoff of the whole publication."
    ],
    starters: [
      "The next step should be to [action], because the evidence suggests [reason].",
      "Readers should use this project to [decision or next test]."
    ],
    weakExample: "More work could be done.",
    strongExample: "The next step should be to test a narrower constraint rather than a total removal, because the evidence suggests the real problem is timing, not the existence of pressure itself."
  },
  laneSections: {
    id: "laneSections",
    label: "Lane-specific sections",
    stepId: "laneSections",
    required: true,
    recipe: [
      "Finish every lane-specific section so the publication reads like a complete final piece.",
      "Use the prompt of each section as a job, not just a topic.",
      "Make each section clear enough for a new reader."
    ],
    starters: [],
    weakExample: "Leave the lane sections mostly empty.",
    strongExample: "Finish each lane section so the publication matches the output format readers expect."
  },
  artifactLinks: {
    id: "artifactLinks",
    label: "Artifact links",
    stepId: "publish",
    required: false,
    recipe: [
      "Add links to tools, drafts, visuals, or notes if they help the project.",
      "Use one clear label per line.",
      "Only add artifacts a reader could actually use."
    ],
    starters: ["Budget model | https://example.com/tool"],
    weakExample: "misc link",
    strongExample: "Budget model | https://example.com/tool"
  },
  references: {
    id: "references",
    label: "References",
    stepId: "publish",
    required: false,
    recipe: [
      "Add at least one source line if the publication depends on evidence.",
      "Use the format Label | URL | TYPE | note.",
      "Choose sources a reader could follow."
    ],
    starters: ["League report | https://example.com/report | ARTICLE | Supports the main claim"],
    weakExample: "articles online",
    strongExample: "League report | https://example.com/report | ARTICLE | Supports the main claim"
  },
  keywords: {
    id: "keywords",
    label: "Keywords",
    stepId: "publish",
    required: false,
    recipe: [
      "Add a few plain-language search terms.",
      "Use topic phrases a reader would actually search.",
      "Keep the keywords specific to the project."
    ],
    starters: ["second apron, small-market teams, league flexibility"],
    weakExample: "sports, project",
    strongExample: "second apron, small-market teams, league flexibility"
  },
  keyTakeaways: {
    id: "keyTakeaways",
    label: "Key takeaways",
    stepId: "publish",
    required: false,
    recipe: [
      "Write one takeaway per line.",
      "Let each line stand alone.",
      "Capture the finding, the meaning, and the next step."
    ],
    starters: [
      "The pressure arrives before teams hit their hardest spending limit.",
      "The real planning problem is timing, not just payroll size."
    ],
    weakExample: "This project is good.",
    strongExample: "The pressure arrives before teams hit their hardest spending limit."
  },
  publicationSlug: {
    id: "publicationSlug",
    label: "Publication slug",
    stepId: "publish",
    required: false,
    recipe: [
      "Use lowercase words and dashes only.",
      "Keep the slug short and readable.",
      "Leave it blank unless you want a custom publication URL."
    ],
    starters: ["second-apron-flexibility-patterns"],
    weakExample: "My Final Project",
    strongExample: "second-apron-flexibility-patterns"
  },
  reflection: {
    id: "reflection",
    label: "Reflection",
    stepId: "publish",
    required: false,
    recipe: [
      "Say what still feels uncertain.",
      "Name what would improve the project next.",
      "Treat reflection like a smart limit note, not an apology."
    ],
    starters: [
      "The main uncertainty is [uncertainty]. This project would improve if [next improvement]."
    ],
    weakExample: "It was hard.",
    strongExample:
      "The main uncertainty is how teams would respond over multiple seasons. This project would improve with a longer comparison window."
  },
  findingsMd: {
    id: "findingsMd",
    label: "Legacy markdown summary",
    stepId: "review",
    required: false,
    recipe: [
      "Use this only if you want a custom markdown body instead of the structured sections.",
      "Leave it blank if the structured sections already form the final publication.",
      "Treat this as an override, not a required step."
    ],
    starters: [],
    weakExample: "Copy random notes here.",
    strongExample: "Leave this blank unless you truly want a custom markdown body."
  }
};

export function createInitialProjectCoachValues(initial?: Partial<ProjectCoachValues>): ProjectCoachValues {
  return {
    lanePrimary: initial?.lanePrimary ?? "ECONOMIC_INVESTIGATORS",
    projectType: initial?.projectType ?? ProjectType.INVESTIGATION,
    laneTags: initial?.laneTags ?? [initial?.lanePrimary ?? "ECONOMIC_INVESTIGATORS"],
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
    artifactLinks: initial?.artifactLinks ?? "",
    references: initial?.references ?? "",
    keywords: initial?.keywords ?? "",
    keyTakeaways: initial?.keyTakeaways ?? "",
    laneSections: initial?.laneSections ?? getLaneTemplate(initial?.lanePrimary ?? "ECONOMIC_INVESTIGATORS").laneSections.map((section) => ({
      key: section.key,
      title: section.title,
      prompt: section.prompt,
      value: ""
    }))
  };
}

export function createInitialLaneSectionStore(
  initialLane: LaneTag,
  initialSections?: LaneSectionEntry[]
): ProjectCoachLaneSectionStore {
  return Object.fromEntries(
    laneOrder.map((lane) => {
      const templateSections = getLaneTemplate(lane).laneSections;
      const sections =
        lane === initialLane && initialSections
          ? templateSections.map((section) => {
              const existing = initialSections.find((entry) => entry.key === section.key);
              return {
                key: section.key,
                title: existing?.title ?? section.title,
                prompt: existing?.prompt ?? section.prompt,
                value: existing?.value ?? ""
              };
            })
          : templateSections.map((section) => ({
              key: section.key,
              title: section.title,
              prompt: section.prompt,
              value: ""
            }));

      return [lane, sections];
    })
  ) as ProjectCoachLaneSectionStore;
}

export function syncLaneSectionStore(
  store: ProjectCoachLaneSectionStore,
  lane: LaneTag
): ProjectCoachLaneSectionStore {
  const templateSections = getLaneTemplate(lane).laneSections;
  const current = store[lane] ?? [];

  return {
    ...store,
    [lane]: templateSections.map((section) => {
      const existing = current.find((entry) => entry.key === section.key);
      return {
        key: section.key,
        title: section.title,
        prompt: section.prompt,
        value: existing?.value ?? ""
      };
    })
  };
}

export function getProjectCoachDomId(fieldId: string) {
  return `project-field-${fieldId}`;
}

export function isProjectCoachStepId(value: string | null | undefined): value is ProjectCoachStepId {
  return value ? projectCoachStepOrder.includes(value as ProjectCoachStepId) : false;
}

export function getProjectCoachSteps(
  lane: LaneTag,
  options?: ProjectCoachAssessmentOptions
): Record<ProjectCoachStepId, ProjectCoachStepDefinition> {
  const template = getLaneTemplate(lane);
  const issueRequired = options?.issueRequired ?? false;

  return {
    lane: {
      id: "lane",
      shortTitle: "Lane",
      title: "Choose the lane and format",
      fieldIds: ["lanePrimary", "projectType", "laneTags"],
      requiredFieldIds: ["lanePrimary", "projectType"],
      rightNow: "Choose the lane that matches the kind of publication you are really building.",
      whyItMatters: "The lane changes the final output shape, the section prompts, and the kind of help the coach gives.",
      recipe: fieldConfigs.lanePrimary.recipe,
      starters: [],
      weakExample: fieldConfigs.lanePrimary.weakExample,
      strongExample: fieldConfigs.lanePrimary.strongExample
    },
    context: {
      id: "context",
      shortTitle: "Context",
      title: "Anchor the work in the league",
      fieldIds: ["issueId", "teamId", "supportingProposalId", "collaboratorIds"],
      requiredFieldIds: issueRequired ? ["issueId"] : [],
      rightNow: "Choose the main issue first, then add any team, proposal, or collaborator details that help the reader place the work.",
      whyItMatters: "A clear issue anchor keeps the project tied to a real league problem instead of drifting into a generic classroom topic.",
      recipe: [
        "Choose the one issue that the work is mainly responding to.",
        "Use the other context fields only when they genuinely help explain the work.",
        "Leave extra fields empty instead of adding noise."
      ],
      starters: [],
      weakExample: "The project talks about league pressure, but the main issue is still fuzzy.",
      strongExample: "The project clearly names the one issue it is trying to help and only adds extra context that matters."
    },
    opening: {
      id: "opening",
      shortTitle: "Opening",
      title: "Write the opening layer",
      fieldIds: ["title", "summary", "abstract"],
      requiredFieldIds: ["title", "summary", "abstract"],
      rightNow: "Name the project and explain it fast enough that a brand-new reader can follow.",
      whyItMatters: "The opening decides whether the project feels publishable or still feels like unfinished notes.",
      recipe: [
        "Give the project a clear title.",
        "Write a short summary for speed.",
        "Write an abstract that explains the question, method, and main result."
      ],
      starters: fieldConfigs.title.starters,
      weakExample: "A vague title and two generic sentences.",
      strongExample: "A clear title, a fast summary, and an abstract that shows the whole project."
    },
    mission: {
      id: "mission",
      shortTitle: "Mission",
      title: "State the question and method",
      fieldIds: ["essentialQuestion", "methodsSummary"],
      requiredFieldIds: ["essentialQuestion", "methodsSummary"],
      rightNow: "Tell the reader what this project is trying to answer or build, and how the work was done.",
      whyItMatters: "Strong projects feel intentional because they state the mission and the method clearly.",
      recipe: [
        "State the question or mission in one clear line.",
        "Keep the method concrete.",
        "Make sure the mission fits the chosen lane."
      ],
      starters: fieldConfigs.essentialQuestion.starters,
      weakExample: "The project seems curious, but the mission and method are fuzzy.",
      strongExample: "The project clearly states what it is trying to answer and how it studied the problem."
    },
    body: {
      id: "body",
      shortTitle: "Body",
      title: "Build the core argument",
      fieldIds: ["overview", "context", "evidence", "analysis", "recommendations"],
      requiredFieldIds: ["overview", "evidence", "analysis", "recommendations"],
      rightNow: "Write the core publication body so the reader sees the main point, the evidence, the meaning, and the next step.",
      whyItMatters: "This is where the project becomes an actual brief, dossier, tool write-up, or memo instead of just a topic.",
      recipe: [
        `Open with the ${template.overviewLabel.toLowerCase()}.`,
        "Name the evidence and explain what it means.",
        "End with a concrete recommendation or next step."
      ],
      starters: fieldConfigs.overview.starters,
      weakExample: "The body lists ideas, but the reader never sees the real pattern or payoff.",
      strongExample: "The body opens clearly, grounds itself in evidence, interprets the pattern, and ends with a useful next move."
    },
    laneSections: {
      id: "laneSections",
      shortTitle: "Lane sections",
      title: `Finish the ${template.outputLabel.toLowerCase()} sections`,
      fieldIds: ["laneSections"],
      requiredFieldIds: ["laneSections"],
      rightNow: `Complete the sections that make a ${template.outputLabel.toLowerCase()} feel finished, not generic.`,
      whyItMatters: `These are the sections that make this lane distinct. Without them, the publication loses its real format.`,
      recipe: [
        "Use each section prompt as a job to complete.",
        "Keep each lane-specific section understandable to a new reader.",
        "Make sure the section supports the chosen output format."
      ],
      starters: [],
      weakExample: "The lane-specific sections are mostly empty or feel copied from another format.",
      strongExample: `Each ${template.outputLabel.toLowerCase()} section does its own clear job.`
    },
    publish: {
      id: "publish",
      shortTitle: "Publish",
      title: "Add evidence links and publication details",
      fieldIds: ["artifactLinks", "references", "keywords", "keyTakeaways", "publicationSlug", "reflection"],
      requiredFieldIds: [],
      rightNow: "Add the links, labels, and notes that make the project easier to trust, skim, and publish.",
      whyItMatters: "Publication details turn a strong internal draft into something that can travel outside the immediate classroom context.",
      recipe: [
        "Add supporting links or references when they help.",
        "Use keywords and takeaways to make the project skim-friendly.",
        "Use reflection to tell the truth about limits and next improvements."
      ],
      starters: fieldConfigs.references.starters,
      weakExample: "No publication details, no references, and no reflection about limits.",
      strongExample: "The project includes the small details that make it readable and trustworthy."
    },
    review: {
      id: "review",
      shortTitle: "Review",
      title: "Review before you submit",
      fieldIds: ["findingsMd"],
      requiredFieldIds: [],
      rightNow: "Read the blocker list, check the lane checklist, and only submit once the project is truly coherent.",
      whyItMatters: "The review step makes sure the work matches the lane, the evidence, and the publication standards before it leaves draft mode.",
      recipe: [
        "Clear every blocker before submitting.",
        "Use the lane checklist like an editor.",
        "Only write legacy markdown if you truly want to override the structured body."
      ],
      starters: [],
      weakExample: "Submit because the boxes are filled, even though the publication still feels unfinished.",
      strongExample: "Submit only when the coach, the lane checklist, and the body all point in the same direction."
    }
  };
}

export function assessProjectCoach(
  values: ProjectCoachValues,
  options?: ProjectCoachAssessmentOptions
): ProjectCoachAssessment {
  const issueRequired = options?.issueRequired ?? false;
  const steps = getProjectCoachSteps(values.lanePrimary, options);
  const laneTemplate = getLaneTemplate(values.lanePrimary);
  const laneSectionEvaluations = values.laneSections.map((section) =>
    evaluateLaneSection(section, laneTemplate.outputLabel)
  );

  const fields = {
    lanePrimary: evaluateLanePrimary(values.lanePrimary),
    projectType: evaluateProjectType(values.projectType),
    laneTags: evaluateLaneTags(values.laneTags, values.lanePrimary),
    issueId: evaluateIssueLink(values.issueId, issueRequired),
    teamId: evaluateTeamLink(values.teamId),
    supportingProposalId: evaluateSupportingProposal(values.supportingProposalId),
    collaboratorIds: evaluateCollaborators(values.collaboratorIds),
    title: evaluateTitle(values.title),
    summary: evaluateSummary(values.summary),
    abstract: evaluateAbstract(values.abstract),
    essentialQuestion: evaluateQuestion(values.essentialQuestion),
    methodsSummary: evaluateMethods(values.methodsSummary),
    overview: evaluateOverview(values.overview, laneTemplate.overviewLabel),
    context: evaluateContext(values.context),
    evidence: evaluateEvidence(values.evidence),
    analysis: evaluateAnalysis(values.analysis),
    recommendations: evaluateRecommendations(values.recommendations),
    laneSections: evaluateLaneSections(laneSectionEvaluations, laneTemplate.outputLabel),
    artifactLinks: evaluateArtifactLinks(values.artifactLinks),
    references: evaluateReferences(values.references),
    keywords: evaluateKeywords(values.keywords),
    keyTakeaways: evaluateTakeaways(values.keyTakeaways),
    publicationSlug: evaluateSlug(values.publicationSlug),
    reflection: evaluateReflection(values.reflection),
    findingsMd: evaluateFindings(values.findingsMd)
  } satisfies Record<ProjectCoachFieldId, ProjectCoachFieldEvaluation>;

  const stepEvaluations = {} as Record<ProjectCoachStepId, ProjectCoachStepEvaluation>;

  for (const stepId of projectCoachStepOrder) {
    const definition = steps[stepId];
    const stepFieldEvaluations = definition.fieldIds.map((fieldId) => fields[fieldId]);
    const requiredFieldEvaluations = definition.requiredFieldIds.map((fieldId) => fields[fieldId]);
    const hasAnyContent = stepHasAnyContent(stepId, values, laneSectionEvaluations);
    const complete = requiredFieldEvaluations.every((field) => field.complete);
    const allReady = stepFieldEvaluations.every((field) =>
      field.required ? field.state === "ready" : field.state === "empty" || field.state === "ready"
    );
    const missingItems = requiredFieldEvaluations.filter((field) => !field.complete).map((field) => field.nextMove);

    let status: CoachStepStatus;
    if (!hasAnyContent) {
      status = "not_started";
    } else if (complete && allReady) {
      status = "done";
    } else if (complete) {
      status = "strong";
    } else {
      status = "needs_work";
    }

    stepEvaluations[stepId] = {
      stepId,
      title: definition.title,
      status,
      complete,
      missingItems,
      nextMove:
        missingItems[0] ??
        stepFieldEvaluations.find((field) => field.state === "strong")?.nextMove ??
        `Good. ${definition.title} is in place.`,
      hasAnyContent
    };
  }

  if (!issueRequired) {
    stepEvaluations.context = {
      ...stepEvaluations.context,
      complete: true,
      nextMove:
        fields.issueId.state !== "empty"
          ? "Good. The project has useful league context."
          : "Optional: add an issue, team, or proposal link if it helps readers place the work."
    };
  }

  stepEvaluations.publish = {
    ...stepEvaluations.publish,
    complete: true,
    nextMove:
      fields.references.state === "ready"
        ? "Good. The project has useful publication details."
        : "Optional: add references, takeaways, or artifact links if they make the publication easier to trust."
  };

  stepEvaluations.review = {
    ...stepEvaluations.review,
    complete: true,
    nextMove: "Read the blocker list, then submit only when the project feels finished for this lane."
  };

  const firstIncompleteStepId = projectCoachStepOrder.find((stepId) => !stepEvaluations[stepId].complete) ?? "review";
  const reviewBuckets = buildReviewBuckets(fields, laneSectionEvaluations, stepEvaluations, laneTemplate.outputLabel);

  return {
    fields,
    laneSectionEvaluations,
    steps: stepEvaluations,
    stepOrder: projectCoachStepOrder,
    firstIncompleteStepId,
    nextAction: stepEvaluations[firstIncompleteStepId].nextMove,
    submitReady: reviewBuckets.blockers.items.length === 0,
    reviewBuckets
  };
}

function buildReviewBuckets(
  fields: Record<ProjectCoachFieldId, ProjectCoachFieldEvaluation>,
  laneSectionEvaluations: ProjectCoachLaneSectionEvaluation[],
  steps: Record<ProjectCoachStepId, ProjectCoachStepEvaluation>,
  outputLabel: string
) {
  const blockers = [
    ...Object.values(fields)
      .filter((field) => field.required && !field.complete)
      .map((field) => `${field.label}: ${field.nextMove}`),
    ...laneSectionEvaluations
      .filter((section) => !section.complete)
      .map((section) => `${section.label}: ${section.nextMove}`)
  ];

  const polish = [
    ...Object.values(fields)
      .filter((field) => !field.required && field.state !== "ready")
      .map((field) => `${field.label}: ${field.nextMove}`),
    laneSectionEvaluations
      .filter((section) => section.state === "strong")
      .map((section) => `${section.label}: One more example or detail would make this ${outputLabel.toLowerCase()} section even clearer.`)
  ].flat();

  const strengths = projectCoachStepOrder
    .filter((stepId) => steps[stepId].status === "done" || steps[stepId].status === "strong")
    .map((stepId) => `${steps[stepId].title} looks strong.`);

  return {
    blockers: {
      title: "Must fix before submit",
      items: blockers
    },
    polish: {
      title: "Would make this stronger",
      items: polish
    },
    strengths: {
      title: "Already strong",
      items: strengths
    }
  };
}

function stepHasAnyContent(
  stepId: ProjectCoachStepId,
  values: ProjectCoachValues,
  laneSectionEvaluations: ProjectCoachLaneSectionEvaluation[]
) {
  switch (stepId) {
    case "lane":
      return Boolean(values.lanePrimary) || values.laneTags.length > 0;
    case "context":
      return Boolean(values.teamId || values.supportingProposalId || values.issueId || values.collaboratorIds.length);
    case "opening":
      return Boolean(values.title || values.summary || values.abstract);
    case "mission":
      return Boolean(values.essentialQuestion || values.methodsSummary);
    case "body":
      return Boolean(values.overview || values.context || values.evidence || values.analysis || values.recommendations);
    case "laneSections":
      return laneSectionEvaluations.some((section) => section.state !== "empty");
    case "publish":
      return Boolean(values.artifactLinks || values.references || values.keywords || values.keyTakeaways || values.publicationSlug || values.reflection);
    case "review":
      return Boolean(values.findingsMd);
  }
}

function evaluateLanePrimary(value: LaneTag) {
  const base = baseFieldEvaluation(fieldConfigs.lanePrimary);
  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Good. The coach now knows which publication shape to guide.",
    nextMove: "Next, make sure the project type and tags still match that lane."
  };
}

function evaluateProjectType(value: ProjectType) {
  const base = baseFieldEvaluation(fieldConfigs.projectType);
  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: `Good. The project type is set to ${value.toLowerCase()}.`,
    nextMove: "Next, decide whether the work needs any extra lane tags."
  };
}

function evaluateLaneTags(values: LaneTag[], lanePrimary: LaneTag) {
  const base = baseFieldEvaluation(fieldConfigs.laneTags);

  if (!values.includes(lanePrimary)) {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "Keep the primary lane checked so the metadata matches the project.",
      nextMove: "Make sure the primary lane tag stays selected.",
      missingIngredients: ["Include the primary lane tag."]
    };
  }

  if (values.length > 2) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "The tags work, but there may be more overlap labels than the project really needs.",
      nextMove: "If you want, remove any extra lane tag that does not add real meaning."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Good. The lane tags look focused.",
    nextMove: "Next, add league context if it helps readers place the work."
  };
}

function evaluateIssueLink(value: string, required: boolean) {
  const base = baseFieldEvaluation(fieldConfigs.issueId, required);

  if (!value.trim()) {
    if (required) {
      return requiredEmptyEvaluation(
        base,
        "Pick one main issue so the project stays tied to a real league problem.",
        [
          "Choose the one issue this project is mainly trying to help."
        ]
      );
    }

    return optionalEmptyEvaluation(base, "Optional: link one issue if the project responds to a live league problem.");
  }

  if (required) {
    return requiredReadyEvaluation(base, "Good. The project is anchored to one clear issue.", "Next, add any extra context that genuinely helps the reader.");
  }

  return optionalReadyEvaluation(base, "Good. The project is anchored to one clear issue.");
}

function evaluateTeamLink(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.teamId);
  if (!value.trim()) {
    return optionalEmptyEvaluation(base, "Optional: link a team if the project is about a specific club.");
  }
  return optionalReadyEvaluation(base, "Good. The project has a team anchor.");
}

function evaluateSupportingProposal(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.supportingProposalId);
  if (!value.trim()) {
    return optionalEmptyEvaluation(base, "Optional: link a proposal if this project supports one.");
  }
  return optionalReadyEvaluation(base, "Good. The project is clearly connected to a proposal.");
}

function evaluateCollaborators(values: string[]) {
  const base = baseFieldEvaluation(fieldConfigs.collaboratorIds);
  if (values.length === 0) {
    return optionalEmptyEvaluation(base, "Optional: add collaborators if other students really shaped the work.");
  }
  return optionalReadyEvaluation(base, "Good. The contributors are visible.");
}

function evaluateTitle(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.title);
  const words = countWords(value);
  if (!value.trim()) {
    return requiredEmptyEvaluation(base, "Add a clear title that tells a new reader what this project is about.", [
      "Name the topic or output.",
      "Be specific enough to stand alone."
    ]);
  }
  if (words < 4 || value.trim().length < 12) {
    return requiredStartingEvaluation(base, "The title starts the topic, but it still needs more clarity.", "Add a few more specific words so the title stands on its own.");
  }
  if (!actionVerbPattern.test(value) && words < 7) {
    return requiredDevelopingEvaluation(base, "The title is clearer, but it still reads a little too broad.", "Add the pattern, question, or output so the title sounds more exact.");
  }
  if (value.trim().length < 28) {
    return requiredStrongEvaluation(base, "Good. A new reader can tell what this publication is about.", "If you want, tighten one more phrase so the title sounds even more precise.");
  }
  return requiredReadyEvaluation(base, "Excellent. The title frames the project clearly.", "Next, write the short summary.");
}

function evaluateSummary(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.summary);
  const words = countWords(value);
  if (!value.trim()) {
    return requiredEmptyEvaluation(base, "Write one or two calm sentences that explain the project fast.", [
      "Name the topic.",
      "Name the method or output.",
      "Name the purpose."
    ]);
  }
  if (words < 8) {
    return requiredStartingEvaluation(base, "The summary is too short to orient a new reader yet.", "Add one more sentence that explains the method or the purpose.");
  }
  if (!meaningPattern.test(value)) {
    return requiredDevelopingEvaluation(base, "The summary has the topic, but it still needs the purpose or main payoff.", "Add what the reader will understand, build, or learn from the project.");
  }
  if (words < 24) {
    return requiredStrongEvaluation(base, "Good. The summary gives the reader a quick handle on the project.", "Next, write the abstract that expands the same idea a little more.");
  }
  return requiredReadyEvaluation(base, "Excellent. The summary is quick and useful.", "Next, write the abstract.");
}

function evaluateAbstract(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.abstract);
  const words = countWords(value);
  if (!value.trim()) {
    return requiredEmptyEvaluation(base, "Write the abstract so the reader can see the question, method, and main result.", [
      "Name the question or mission.",
      "Name the evidence or method.",
      "Name the result or output."
    ]);
  }
  if (words < 14) {
    return requiredStartingEvaluation(base, "The abstract starts the project, but it still feels too thin.", "Add what the work uses and what it finds.");
  }
  if (!evidencePattern.test(value) || !meaningPattern.test(value)) {
    return requiredDevelopingEvaluation(base, "The abstract needs the method or the main meaning more clearly.", "Add the evidence or method, then say what the project finds.");
  }
  if (words < 38) {
    return requiredStrongEvaluation(base, "Good. The abstract gives the reader the full shape of the work.", "Next, state the question or mission in one clear line.");
  }
  return requiredReadyEvaluation(base, "Excellent. The abstract makes the project feel publishable already.", "Next, state the question or mission.");
}

function evaluateQuestion(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.essentialQuestion);
  const words = countWords(value);
  if (!value.trim()) {
    return requiredEmptyEvaluation(base, "State the research question or design mission clearly.", [
      "Use one clear line.",
      "Make it answerable or buildable.",
      "Fit it to the lane."
    ]);
  }
  if (words < 6) {
    return requiredStartingEvaluation(base, "The mission is starting to appear, but it is still too small.", "Add the real subject and what the project wants to understand or build.");
  }
  if (!questionPattern.test(value)) {
    return requiredDevelopingEvaluation(base, "The line exists, but it still does not sound like a clear question or mission.", "Use words like how, why, what, mission, or goal to sharpen it.");
  }
  if (words < 18) {
    return requiredStrongEvaluation(base, "Good. The mission is clear enough to guide the body.", "Next, explain how the work was investigated or built.");
  }
  return requiredReadyEvaluation(base, "Excellent. The question or mission is focused and specific.", "Next, explain the method.");
}

function evaluateMethods(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.methodsSummary);
  const words = countWords(value);
  if (!value.trim()) {
    return requiredEmptyEvaluation(base, "Explain how the work was investigated or built.", [
      "Name the records, inputs, or build steps.",
      "Keep it concrete.",
      "Tell the reader why the method is trustworthy."
    ]);
  }
  if (words < 10) {
    return requiredStartingEvaluation(base, "The methods line is there, but it still needs more process detail.", "Add what you compared, built, traced, or tested.");
  }
  if (!/\b(compare|comparing|trace|tracing|build|building|test|testing|study|analy[sz]e|investigate|using|use)\b/i.test(value)) {
    return requiredDevelopingEvaluation(base, "The methods summary exists, but it still does not show the actual process.", "Add the concrete steps you used to investigate or build the project.");
  }
  if (words < 28) {
    return requiredStrongEvaluation(base, "Good. The method feels concrete enough to trust.", "Next, open the body with the main point.");
  }
  return requiredReadyEvaluation(base, "Excellent. The method is clear and credible.", "Next, open the body.");
}

function evaluateOverview(value: string, overviewLabel: string) {
  const base = baseFieldEvaluation({
    ...fieldConfigs.overview,
    label: overviewLabel
  });
  const words = countWords(value);
  if (!value.trim()) {
    return requiredEmptyEvaluation(base, `Write the ${overviewLabel.toLowerCase()} so the reader knows where the publication is going.`, [
      "Open with the main point.",
      "Show the direction of the body.",
      "Keep it calm and clear."
    ]);
  }
  if (words < 10) {
    return requiredStartingEvaluation(base, "The opening point is starting, but it still needs more direction.", "Add one more sentence that shows where the rest of the piece is going.");
  }
  if (!meaningPattern.test(value) && words < 18) {
    return requiredDevelopingEvaluation(base, "The overview exists, but it still reads a bit like notes instead of a clear opening.", "Tell the reader what the main point means.");
  }
  if (words < 32) {
    return requiredStrongEvaluation(base, `Good. The ${overviewLabel.toLowerCase()} gives the reader a strong start.`, "Next, name the evidence that supports the work.");
  }
  return requiredReadyEvaluation(base, `Excellent. The ${overviewLabel.toLowerCase()} is clear and directional.`, "Next, name the evidence.");
}

function evaluateContext(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.context);
  const words = countWords(value);
  if (!value.trim()) {
    return optionalEmptyEvaluation(base, "Optional: add background if the reader needs context before the findings.");
  }
  if (words < 10) {
    return optionalStartingEvaluation(base, "The background starts to help, but it still needs one more concrete detail.", "Add the league condition or definition readers need before the evidence.");
  }
  if (words < 28) {
    return optionalStrongEvaluation(base, "Good. The context gives readers some orientation.");
  }
  return optionalReadyEvaluation(base, "Excellent. The context prepares the reader well.");
}

function evaluateEvidence(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.evidence);
  const words = countWords(value);
  if (!value.trim()) {
    return requiredEmptyEvaluation(base, "Name the records, observations, source material, or inputs you used.", [
      "Say what you used.",
      "Say why it matters.",
      "Make the evidence trail followable."
    ]);
  }
  if (words < 12) {
    return requiredStartingEvaluation(base, "The evidence is named, but it still needs more detail.", "Add where the evidence came from or what kind of input it is.");
  }
  if (!evidencePattern.test(value)) {
    return requiredDevelopingEvaluation(base, "The reader still cannot clearly see the evidence trail.", "Use words like records, sources, observations, data, or inputs to make the evidence concrete.");
  }
  if (words < 34) {
    return requiredStrongEvaluation(base, "Good. The evidence trail is becoming clear.", "Next, explain what the evidence means.");
  }
  return requiredReadyEvaluation(base, "Excellent. The evidence is concrete and readable.", "Next, explain what it means.");
}

function evaluateAnalysis(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.analysis);
  const words = countWords(value);
  if (!value.trim()) {
    return requiredEmptyEvaluation(base, "Explain the pattern, mechanism, or meaning behind the evidence.", [
      "Name the pattern.",
      "Explain why it happens.",
      "Show why it matters."
    ]);
  }
  if (words < 12) {
    return requiredStartingEvaluation(base, "The analysis begins, but it still sounds more like a note than an interpretation.", "Add why the pattern matters.");
  }
  if (!meaningPattern.test(value)) {
    return requiredDevelopingEvaluation(base, "The reader still needs the interpretation, not just the fact.", "Use because, means, or pattern language to explain the meaning behind the evidence.");
  }
  if (words < 34) {
    return requiredStrongEvaluation(base, "Good. The evidence now has meaning behind it.", "Next, end with a recommendation or concrete next step.");
  }
  return requiredReadyEvaluation(base, "Excellent. The analysis interprets the evidence clearly.", "Next, end with the recommendation.");
}

function evaluateRecommendations(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.recommendations);
  const words = countWords(value);
  if (!value.trim()) {
    return requiredEmptyEvaluation(base, "End with a concrete action or next step.", [
      "Say what should happen next.",
      "Name the reader's next move.",
      "Make the payoff of the project visible."
    ]);
  }
  if (words < 8) {
    return requiredStartingEvaluation(base, "The recommendation is present, but it still feels too thin.", "Add the exact action, test, or decision the reader should take.");
  }
  if (!actionVerbPattern.test(value)) {
    return requiredDevelopingEvaluation(base, "The ending still sounds broad instead of actionable.", "Use a clear action word so the next step sounds concrete.");
  }
  if (words < 24) {
    return requiredStrongEvaluation(base, "Good. The publication ends with a real next step.", "Next, complete the lane-specific sections.");
  }
  return requiredReadyEvaluation(base, "Excellent. The ending feels concrete and useful.", "Next, complete the lane-specific sections.");
}

function evaluateLaneSection(section: LaneSectionEntry, outputLabel: string): ProjectCoachLaneSectionEvaluation {
  const words = countWords(section.value);
  if (!section.value.trim()) {
    return {
      key: section.key,
      label: section.title,
      state: "empty",
      complete: false,
      message: `${section.title} still needs a real answer for this ${outputLabel.toLowerCase()}.`,
      nextMove: `Answer the ${section.title.toLowerCase()} prompt in plain language.`,
      recipe: [
        "Respond to the exact prompt.",
        "Keep the explanation easy for a new reader.",
        "Make the section do a clear job in the publication."
      ],
      starters: [section.prompt],
      missingIngredients: ["Answer the section prompt."],
      weakExample: "A vague note that does not really answer the prompt.",
      strongExample: `A clear section that directly answers: ${section.prompt}`
    };
  }
  if (words < 10) {
    return {
      key: section.key,
      label: section.title,
      state: "starting",
      complete: false,
      message: `${section.title} has started, but it still needs more detail.`,
      nextMove: `Add one more sentence that makes ${section.title.toLowerCase()} easy to follow.`,
      recipe: [
        "Answer the prompt directly.",
        "Give at least one concrete detail.",
        "Make the section readable on its own."
      ],
      starters: [section.prompt],
      missingIngredients: ["Add more detail."],
      weakExample: "A short note with no explanation.",
      strongExample: `A short paragraph that answers the ${section.title.toLowerCase()} prompt directly.`
    };
  }
  if (words < 26) {
    return {
      key: section.key,
      label: section.title,
      state: "strong",
      complete: true,
      message: `${section.title} is clear, but one more concrete detail would strengthen it.`,
      nextMove: `Add one more example, condition, or implication to ${section.title.toLowerCase()}.`,
      recipe: [
        "Directly answer the prompt.",
        "Name one concrete detail.",
        "Connect the section to the rest of the publication."
      ],
      starters: [section.prompt],
      missingIngredients: [],
      weakExample: "A section that only names the idea.",
      strongExample: `A paragraph that answers ${section.title.toLowerCase()} and adds one concrete detail.`
    };
  }
  return {
    key: section.key,
    label: section.title,
    state: "ready",
    complete: true,
    message: `${section.title} is clear and useful.`,
    nextMove: `Good. ${section.title} now supports the lane-specific format well.`,
    recipe: [
      "Answer the prompt directly.",
      "Use concrete details.",
      "Keep the section readable to a new reader."
    ],
    starters: [section.prompt],
    missingIngredients: [],
    weakExample: "A section that circles the topic without landing.",
    strongExample: `A clear paragraph that fully answers ${section.title.toLowerCase()} in plain language.`
  };
}

function evaluateLaneSections(sections: ProjectCoachLaneSectionEvaluation[], outputLabel: string) {
  const base = baseFieldEvaluation(fieldConfigs.laneSections);
  if (sections.length === 0 || sections.some((section) => !section.complete)) {
    return {
      ...base,
      state: sections.some((section) => section.state !== "empty") ? ("developing" as const) : ("empty" as const),
      complete: false,
      message: `The ${outputLabel.toLowerCase()} sections still need work before the publication feels finished.`,
      nextMove: "Finish each lane-specific section so the final format reads cleanly.",
      missingIngredients: sections.filter((section) => !section.complete).map((section) => section.label)
    };
  }
  if (sections.some((section) => section.state === "strong")) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: `The ${outputLabel.toLowerCase()} sections are strong, but one or two could still use extra detail.`,
      nextMove: "If you want, add one more concrete detail to the strong sections."
    };
  }
  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: `Good. The ${outputLabel.toLowerCase()} sections now match the lane clearly.`,
    nextMove: "Next, add publication details or review the blocker list."
  };
}

function evaluateArtifactLinks(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.artifactLinks);
  const count = parseStringList(value).length;
  if (!value.trim()) {
    return optionalEmptyEvaluation(base, "Optional: add links to models, notes, or outputs if they help readers use the work.");
  }
  if (count < 1) {
    return optionalStartingEvaluation(base, "The artifact area has text, but it does not yet look like a usable link line.", "Use the format Label | URL.");
  }
  return count < 2
    ? optionalStrongEvaluation(base, "Good. The project includes at least one useful artifact link.")
    : optionalReadyEvaluation(base, "Excellent. The project includes multiple helpful artifact links.");
}

function evaluateReferences(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.references);
  const count = parseStringList(value).length;
  if (!value.trim()) {
    return optionalEmptyEvaluation(base, "Optional, but helpful: add at least one reference a reader could follow.");
  }
  if (count < 1) {
    return optionalStartingEvaluation(base, "The reference area has text, but it still does not look like a usable source line.", "Use the format Label | URL | TYPE | note.");
  }
  return count < 2
    ? optionalStrongEvaluation(base, "Good. There is at least one usable source behind the project.")
    : optionalReadyEvaluation(base, "Excellent. The project has a clearer evidence trail.");
}

function evaluateKeywords(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.keywords);
  const count = value.split(",").map((item) => item.trim()).filter(Boolean).length;
  if (!value.trim()) {
    return optionalEmptyEvaluation(base, "Optional: add search-friendly topic phrases.");
  }
  if (count < 2) {
    return optionalStartingEvaluation(base, "The keywords started to help, but they still need one or two more useful phrases.", "Add two or three plain-language topic words.");
  }
  return count < 4
    ? optionalStrongEvaluation(base, "Good. The keywords will help readers find the topic faster.")
    : optionalReadyEvaluation(base, "Excellent. The keywords are focused and useful.");
}

function evaluateTakeaways(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.keyTakeaways);
  const count = parseStringList(value).length;
  if (!value.trim()) {
    return optionalEmptyEvaluation(base, "Optional: add takeaway lines if you want the project easier to skim.");
  }
  if (count < 2) {
    return optionalStartingEvaluation(base, "The takeaways started to help, but one more line would make the project easier to skim.", "Add one more standalone takeaway line.");
  }
  return count < 3
    ? optionalStrongEvaluation(base, "Good. The project now has useful skim lines.")
    : optionalReadyEvaluation(base, "Excellent. The takeaways make the publication easier to scan.");
}

function evaluateSlug(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.publicationSlug);
  if (!value.trim()) {
    return optionalEmptyEvaluation(base, "Optional: add a custom publication slug if you want a specific URL shape.");
  }
  if (!/^[a-z0-9-]+$/.test(value.trim())) {
    return optionalStartingEvaluation(base, "The slug should use lowercase letters, numbers, and dashes only.", "Remove spaces, uppercase letters, and punctuation.");
  }
  return optionalReadyEvaluation(base, "Good. The custom slug is publication-ready.");
}

function evaluateReflection(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.reflection);
  const words = countWords(value);
  if (!value.trim()) {
    return optionalEmptyEvaluation(base, "Optional: add a reflection if you want readers to see the real limits and next improvement.");
  }
  if (words < 10) {
    return optionalStartingEvaluation(base, "The reflection begins, but it still needs the uncertainty or next improvement more clearly.", "Add what still feels uncertain and what would improve the work.");
  }
  return words < 26
    ? optionalStrongEvaluation(base, "Good. The reflection names a real limit.")
    : optionalReadyEvaluation(base, "Excellent. The reflection sounds honest and useful.");
}

function evaluateFindings(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.findingsMd);
  if (!value.trim()) {
    return optionalReadyEvaluation(base, "Good. The structured sections will become the publication body unless you override them.");
  }
  return optionalReadyEvaluation(base, "Good. You added a custom markdown summary for the final body.");
}

function baseFieldEvaluation(config: FieldConfig, required = config.required) {
  return {
    fieldId: config.id,
    label: config.label,
    stepId: config.stepId,
    required,
    recipe: config.recipe,
    starters: config.starters,
    missingIngredients: [] as string[],
    weakExample: config.weakExample,
    strongExample: config.strongExample
  };
}

function requiredEmptyEvaluation(base: ReturnType<typeof baseFieldEvaluation>, message: string, missingIngredients: string[]) {
  return {
    ...base,
    state: "empty" as const,
    complete: false,
    message,
    nextMove: missingIngredients[0] ?? "Add the missing part.",
    missingIngredients
  };
}

function requiredStartingEvaluation(base: ReturnType<typeof baseFieldEvaluation>, message: string, nextMove: string) {
  return {
    ...base,
    state: "starting" as const,
    complete: false,
    message,
    nextMove,
    missingIngredients: [nextMove]
  };
}

function requiredDevelopingEvaluation(base: ReturnType<typeof baseFieldEvaluation>, message: string, nextMove: string) {
  return {
    ...base,
    state: "developing" as const,
    complete: false,
    message,
    nextMove,
    missingIngredients: [nextMove]
  };
}

function requiredStrongEvaluation(base: ReturnType<typeof baseFieldEvaluation>, message: string, nextMove: string) {
  return {
    ...base,
    state: "strong" as const,
    complete: true,
    message,
    nextMove
  };
}

function requiredReadyEvaluation(base: ReturnType<typeof baseFieldEvaluation>, message: string, nextMove: string) {
  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message,
    nextMove
  };
}

function optionalEmptyEvaluation(base: ReturnType<typeof baseFieldEvaluation>, message: string) {
  return {
    ...base,
    state: "empty" as const,
    complete: false,
    message,
    nextMove: message
  };
}

function optionalStartingEvaluation(base: ReturnType<typeof baseFieldEvaluation>, message: string, nextMove: string) {
  return {
    ...base,
    state: "starting" as const,
    complete: false,
    message,
    nextMove,
    missingIngredients: [nextMove]
  };
}

function optionalStrongEvaluation(base: ReturnType<typeof baseFieldEvaluation>, message: string) {
  return {
    ...base,
    state: "strong" as const,
    complete: true,
    message,
    nextMove: "Good. This optional detail already helps the publication."
  };
}

function optionalReadyEvaluation(base: ReturnType<typeof baseFieldEvaluation>, message: string) {
  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message,
    nextMove: "Good. This detail is ready."
  };
}

function countWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function artifactLinksToText(value: ArtifactLink[]) {
  return value.map((link) => `${link.label} | ${link.url}`).join("\n");
}

export function referencesToText(value: ReferenceEntry[]) {
  return value
    .map((reference) =>
      [reference.label, reference.url, reference.sourceType, reference.note ?? ""]
        .filter(Boolean)
        .join(" | ")
    )
    .join("\n");
}
