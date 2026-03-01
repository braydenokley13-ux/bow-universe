import { parseRuleDiff } from "@/lib/rules";
import type { RuleDiff, SandboxImpactReport } from "@/lib/types";
import { parseStringList } from "@/lib/utils";

export type ProposalCoachStepId =
  | "issue"
  | "ruleset"
  | "title"
  | "abstract"
  | "problem"
  | "currentRule"
  | "reform"
  | "impact"
  | "tradeoffs"
  | "action"
  | "sandbox"
  | "review";

export type ProposalCoachFieldId =
  | "issueId"
  | "ruleSetId"
  | "title"
  | "abstract"
  | "problem"
  | "currentRuleContext"
  | "proposedChange"
  | "expectedImpact"
  | "tradeoffs"
  | "recommendation"
  | "methodsSummary"
  | "diffJson"
  | "sandboxResult"
  | "sandboxInterpretation"
  | "references"
  | "keywords"
  | "keyTakeaways"
  | "publicationSlug";

export type ProposalCoachFieldState = "empty" | "starting" | "developing" | "strong" | "ready";

export type ProposalCoachStepStatus = "not_started" | "needs_work" | "strong" | "done";

export type SandboxFreshnessState = "idle" | "invalid" | "fresh" | "stale";

export type ProposalCoachValues = {
  title: string;
  issueId: string;
  ruleSetId: string;
  abstract: string;
  methodsSummary: string;
  problem: string;
  currentRuleContext: string;
  proposedChange: string;
  expectedImpact: string;
  tradeoffs: string;
  sandboxInterpretation: string;
  recommendation: string;
  diffJson: string;
  references: string;
  keywords: string;
  keyTakeaways: string;
  publicationSlug: string;
};

export type ProposalCoachMessage = {
  title: string;
  body: string;
};

export type ProposalCoachFieldEvaluation = {
  fieldId: ProposalCoachFieldId;
  label: string;
  stepId: ProposalCoachStepId;
  required: boolean;
  state: ProposalCoachFieldState;
  complete: boolean;
  message: string;
  nextMove: string;
  recipe: string[];
  starters: string[];
  missingIngredients: string[];
  weakExample: string;
  strongExample: string;
};

export type ProposalCoachStepDefinition = {
  id: ProposalCoachStepId;
  shortTitle: string;
  title: string;
  fieldIds: ProposalCoachFieldId[];
  requiredFieldIds: ProposalCoachFieldId[];
  rightNow: string;
  whyItMatters: string;
  recipe: string[];
  starters: string[];
  weakExample: string;
  strongExample: string;
};

export type ProposalCoachStepEvaluation = {
  stepId: ProposalCoachStepId;
  title: string;
  status: ProposalCoachStepStatus;
  complete: boolean;
  missingItems: string[];
  nextMove: string;
  hasAnyContent: boolean;
};

export type ProposalCoachReviewBucket = {
  title: string;
  items: string[];
};

export type ProposalCoachSandboxState = {
  result: SandboxImpactReport | null;
  runFingerprint: string | null;
};

export type ProposalCoachAssessment = {
  fields: Record<ProposalCoachFieldId, ProposalCoachFieldEvaluation>;
  steps: Record<ProposalCoachStepId, ProposalCoachStepEvaluation>;
  stepOrder: ProposalCoachStepId[];
  reviewBuckets: {
    blockers: ProposalCoachReviewBucket;
    polish: ProposalCoachReviewBucket;
    strengths: ProposalCoachReviewBucket;
  };
  firstIncompleteStepId: ProposalCoachStepId;
  nextAction: string;
  submitReady: boolean;
  sandboxFreshness: SandboxFreshnessState;
  sandboxFingerprint: string | null;
  diffError: string | null;
};

type FieldConfig = {
  id: ProposalCoachFieldId;
  label: string;
  stepId: ProposalCoachStepId;
  required: boolean;
  recipe: string[];
  starters: string[];
  weakExample: string;
  strongExample: string;
};

const actionVerbPattern =
  /\b(change|raise|lower|replace|add|remove|limit|allow|require|expand|reduce|increase|decrease|adopt|revise|create|cap|ban|protect|exempt)\b/i;
const affectedGroupPattern =
  /\b(team|teams|league|small-market|large-market|market|owners|players|contenders|rebuilding|taxpayer|non-taxpayer|clubs)\b/i;
const contrastPattern = /\b(but|however|while|although|risk|tradeoff|cost|harder|pressure|downside|lose)\b/i;
const interpretationPattern =
  /\b(means|suggests|shows|because|therefore|decision|league|should|would|could|signals|implies)\b/i;
const ruleContextPattern =
  /\b(current|today|now|existing|under|rule|apron|threshold|sharing|cap|tax)\b/i;

export const defaultProposalDiffJson = `{
  "changes": [
    {
      "op": "replace",
      "path": "/revenueSharingRate",
      "value": 0.16,
      "reason": "Raise the league sharing pool slightly."
    }
  ]
}`;

export const proposalCoachStepOrder: ProposalCoachStepId[] = [
  "issue",
  "ruleset",
  "title",
  "abstract",
  "problem",
  "currentRule",
  "reform",
  "impact",
  "tradeoffs",
  "action",
  "sandbox",
  "review"
];

const fieldConfigs: Record<ProposalCoachFieldId, FieldConfig> = {
  issueId: {
    id: "issueId",
    label: "Live issue",
    stepId: "issue",
    required: true,
    recipe: [
      "Pick the league problem this memo is trying to solve.",
      "Choose the issue that best matches the pressure point you will write about.",
      "Make sure the issue is specific enough to anchor a decision."
    ],
    starters: [],
    weakExample: "Choose issue later.",
    strongExample: "Pick the current issue that shows the rule pressure your memo addresses."
  },
  ruleSetId: {
    id: "ruleSetId",
    label: "Rule baseline",
    stepId: "ruleset",
    required: true,
    recipe: [
      "Pick the active ruleset you want to change.",
      "Use one baseline so your proposal compares against something real.",
      "Treat this as the starting point for the sandbox."
    ],
    starters: [],
    weakExample: "I will just talk about the rules in general.",
    strongExample: "Use the current RuleSet version so your reform has a clear baseline."
  },
  title: {
    id: "title",
    label: "Decision title",
    stepId: "title",
    required: true,
    recipe: [
      "Name the rule or mechanism that should change.",
      "Hint at the action, not just the topic.",
      "Make the title specific enough that a reader can predict the memo."
    ],
    starters: [
      "Raise the revenue sharing rate to protect small-market flexibility",
      "Revise the second apron threshold to reduce mid-tier roster lock-in"
    ],
    weakExample: "Rule Change Proposal",
    strongExample: "Raise the revenue sharing rate to protect small-market flexibility"
  },
  abstract: {
    id: "abstract",
    label: "Fast summary",
    stepId: "abstract",
    required: true,
    recipe: [
      "Name the problem in one sentence.",
      "Name the reform in one sentence.",
      "Name the likely effect in one sentence."
    ],
    starters: [
      "The league is struggling with [problem]. This memo proposes [rule change]. If adopted, the change would likely [main effect].",
      "Right now, [current pressure] is hurting [group]. I recommend [change] because it would [expected result]."
    ],
    weakExample: "This proposal is about league fairness.",
    strongExample:
      "The current second apron rules restrict planned short-term spending spikes. This memo proposes a narrower apron exception for rebuilding teams. If adopted, the change would improve roster flexibility without fully removing spending pressure."
  },
  problem: {
    id: "problem",
    label: "Problem",
    stepId: "problem",
    required: true,
    recipe: [
      "Explain what is going wrong now.",
      "Say who is affected.",
      "Say why it matters enough to justify a rule decision."
    ],
    starters: [
      "The current problem is that [group] faces [pressure], which leads to [bad outcome].",
      "Right now, the league creates a problem because [rule or pressure]. This matters because [effect]."
    ],
    weakExample: "Teams are unhappy with the rules.",
    strongExample:
      "Small-market teams lose planned spending flexibility once tax pressure rises, which makes it harder to bridge from rebuilding to contention even when ownership is willing to spend for a short window."
  },
  currentRuleContext: {
    id: "currentRuleContext",
    label: "Current rule context",
    stepId: "currentRule",
    required: true,
    recipe: [
      "Describe the rule as it works today.",
      "Explain the pressure it creates.",
      "Set up the reform before you argue for it."
    ],
    starters: [
      "Under the current RuleSet, the league [current rule]. This creates pressure because [effect].",
      "Right now, teams that cross [threshold] face [constraint], which changes decisions about [behavior]."
    ],
    weakExample: "There are many rules and they matter.",
    strongExample:
      "Under the current RuleSet, teams above the second apron lose important spending tools. That discourages large payroll spikes, but it also blocks deliberate short-term spending when a smaller market team is trying to hold together a viable core."
  },
  proposedChange: {
    id: "proposedChange",
    label: "Proposed change",
    stepId: "reform",
    required: true,
    recipe: [
      "State the rule change like a decision the league could vote on.",
      "Say what changes, not just what goal you want.",
      "Be concrete enough to translate into a rule diff."
    ],
    starters: [
      "The league should change [rule] by [specific adjustment].",
      "I propose replacing [current setting] with [new setting] so that [reason]."
    ],
    weakExample: "The league should be more fair.",
    strongExample:
      "The league should replace the current revenue sharing rate with a slightly larger pool so that small-market teams keep more short-term competitive flexibility during a build-up window."
  },
  expectedImpact: {
    id: "expectedImpact",
    label: "Expected impact",
    stepId: "impact",
    required: true,
    recipe: [
      "Name who gains something.",
      "Name who loses flexibility or leverage.",
      "Explain why the balance shifts."
    ],
    starters: [
      "If the league changes this rule, [group] would gain [benefit], while [group] would lose [flexibility or advantage] because [reason].",
      "The main likely effect is that [group] could [new behavior], while [other group] would face [new cost or limit]."
    ],
    weakExample: "The rule would probably help the league.",
    strongExample:
      "If the league raises the revenue sharing rate, smaller markets would gain more breathing room for planned spending windows, while high-revenue clubs would lose some unilateral flexibility because a larger share of their revenue would flow back into the league pool."
  },
  tradeoffs: {
    id: "tradeoffs",
    label: "Tradeoffs",
    stepId: "tradeoffs",
    required: true,
    recipe: [
      "Say what gets harder if your reform is adopted.",
      "Show the downside honestly.",
      "Explain the cost of the decision, not just the benefit."
    ],
    starters: [
      "The biggest tradeoff is that [group] would lose [benefit], which could create [new pressure].",
      "This reform helps [group], but it also risks [new downside] because [reason]."
    ],
    weakExample: "There may be some downsides.",
    strongExample:
      "This reform would give smaller markets more room to spend into a short competitive window, but it would also reduce the freedom of high-revenue teams to turn local revenue advantages into immediate roster upgrades."
  },
  recommendation: {
    id: "recommendation",
    label: "Recommendation",
    stepId: "action",
    required: true,
    recipe: [
      "State what the league should do next.",
      "Name the actor who should act.",
      "End with a decision, not a discussion topic."
    ],
    starters: [
      "The commissioner should adopt [change] for the next rules cycle.",
      "The league should vote to [decision] because the likely benefit outweighs the tradeoff."
    ],
    weakExample: "The league should think about changing this.",
    strongExample:
      "The commissioner should recommend a small increase in the revenue sharing rate for the next rules cycle because the added flexibility for smaller markets outweighs the loss of spending freedom for top-revenue clubs."
  },
  methodsSummary: {
    id: "methodsSummary",
    label: "Methods summary",
    stepId: "action",
    required: false,
    recipe: [
      "Say how you studied the proposal.",
      "Mention the baseline rules and the sandbox.",
      "Keep it short and concrete."
    ],
    starters: [
      "I compared the active RuleSet to a proposed rule diff and used the BOW sandbox to study likely league effects.",
      "This memo compares the current rules to a targeted diff and interprets the sandbox output for league decision-makers."
    ],
    weakExample: "I looked into it.",
    strongExample:
      "I compared the current RuleSet to a specific rule diff and used the BOW sandbox report to study how the change shifts league-wide balance."
  },
  diffJson: {
    id: "diffJson",
    label: "Rule diff",
    stepId: "sandbox",
    required: true,
    recipe: [
      "Use a valid JSON object with a changes array.",
      "Give each change an op, path, and value when needed.",
      "Add a reason so the model evidence matches the memo."
    ],
    starters: [defaultProposalDiffJson],
    weakExample: `{"idea":"make things fairer"}`,
    strongExample: defaultProposalDiffJson
  },
  sandboxResult: {
    id: "sandboxResult",
    label: "Sandbox evidence",
    stepId: "sandbox",
    required: true,
    recipe: [
      "Run the sandbox after the diff is valid.",
      "Make sure the result matches the current ruleset and diff.",
      "Use the result as evidence, not decoration."
    ],
    starters: [],
    weakExample: "Skip the sandbox and guess the outcome.",
    strongExample: "Run the sandbox after the diff is stable so the report matches the proposal."
  },
  sandboxInterpretation: {
    id: "sandboxInterpretation",
    label: "Sandbox interpretation",
    stepId: "sandbox",
    required: true,
    recipe: [
      "Explain what the result means for a decision-maker.",
      "Connect the metrics to league behavior.",
      "Say whether the evidence supports the reform."
    ],
    starters: [
      "The sandbox suggests this reform would [main effect], which matters because [decision implication].",
      "These results show that [metric shift]. For the league, that means [practical meaning]."
    ],
    weakExample: "Parity delta changed by 0.4 and tax concentration changed too.",
    strongExample:
      "The sandbox suggests the reform slightly redistributes flexibility toward smaller markets. That does not remove spending pressure, but it does make it easier for lower-revenue teams to sustain a short competitive window."
  },
  references: {
    id: "references",
    label: "References",
    stepId: "review",
    required: false,
    recipe: [
      "Add at least one usable source line.",
      "Use the format Label | URL | TYPE | note.",
      "Choose sources a reader could actually follow."
    ],
    starters: ["League finance note | https://example.com | ARTICLE | Supports the reform rationale"],
    weakExample: "Some articles online",
    strongExample: "League finance note | https://example.com | ARTICLE | Supports the reform rationale"
  },
  keywords: {
    id: "keywords",
    label: "Keywords",
    stepId: "review",
    required: false,
    recipe: [
      "Add a few search-friendly topic words.",
      "Use plain words someone would actually search.",
      "Keep them closely tied to the memo."
    ],
    starters: ["revenue sharing, small-market teams, league parity"],
    weakExample: "sports, rules",
    strongExample: "revenue sharing, small-market teams, league parity"
  },
  keyTakeaways: {
    id: "keyTakeaways",
    label: "Key takeaways",
    stepId: "review",
    required: false,
    recipe: [
      "Write short takeaway lines.",
      "Summarize the decision and the main evidence.",
      "Keep each line readable on its own."
    ],
    starters: [
      "A higher sharing pool would give smaller markets more short-term roster flexibility.",
      "The reform helps parity without fully removing spending pressure."
    ],
    weakExample: "This proposal is good.",
    strongExample:
      "A higher sharing pool would give smaller markets more short-term roster flexibility."
  },
  publicationSlug: {
    id: "publicationSlug",
    label: "Publication slug",
    stepId: "review",
    required: false,
    recipe: [
      "Keep it short and readable.",
      "Use lowercase words separated by dashes.",
      "Only add it if you want a custom publication URL."
    ],
    starters: ["raise-revenue-sharing-rate"],
    weakExample: "My Proposal Final Version",
    strongExample: "raise-revenue-sharing-rate"
  }
};

export const proposalCoachSteps: Record<ProposalCoachStepId, ProposalCoachStepDefinition> = {
  issue: {
    id: "issue",
    shortTitle: "Issue",
    title: "Pick the live issue",
    fieldIds: ["issueId"],
    requiredFieldIds: ["issueId"],
    rightNow: "Pick the league issue this memo is trying to solve.",
    whyItMatters: "A strong proposal starts with a real pressure point, not a floating idea.",
    recipe: fieldConfigs.issueId.recipe,
    starters: [],
    weakExample: fieldConfigs.issueId.weakExample,
    strongExample: fieldConfigs.issueId.strongExample
  },
  ruleset: {
    id: "ruleset",
    shortTitle: "Baseline",
    title: "Pick the rule baseline",
    fieldIds: ["ruleSetId"],
    requiredFieldIds: ["ruleSetId"],
    rightNow: "Choose the exact ruleset your proposal wants to change.",
    whyItMatters: "Without a baseline, your reform has nothing concrete to compare against.",
    recipe: fieldConfigs.ruleSetId.recipe,
    starters: [],
    weakExample: fieldConfigs.ruleSetId.weakExample,
    strongExample: fieldConfigs.ruleSetId.strongExample
  },
  title: {
    id: "title",
    shortTitle: "Title",
    title: "Name the decision",
    fieldIds: ["title"],
    requiredFieldIds: ["title"],
    rightNow: "Write a title that tells the reader what decision this memo is arguing for.",
    whyItMatters: "A clear title frames the whole memo before anyone reads the first paragraph.",
    recipe: fieldConfigs.title.recipe,
    starters: fieldConfigs.title.starters,
    weakExample: fieldConfigs.title.weakExample,
    strongExample: fieldConfigs.title.strongExample
  },
  abstract: {
    id: "abstract",
    shortTitle: "Summary",
    title: "Say the whole idea fast",
    fieldIds: ["abstract"],
    requiredFieldIds: ["abstract"],
    rightNow: "Summarize the problem, the reform, and the likely result in a quick opening.",
    whyItMatters: "Decision-makers need the whole memo in miniature before they commit to reading the rest.",
    recipe: fieldConfigs.abstract.recipe,
    starters: fieldConfigs.abstract.starters,
    weakExample: fieldConfigs.abstract.weakExample,
    strongExample: fieldConfigs.abstract.strongExample
  },
  problem: {
    id: "problem",
    shortTitle: "Problem",
    title: "Describe the problem",
    fieldIds: ["problem"],
    requiredFieldIds: ["problem"],
    rightNow: "Explain what is going wrong in the league right now.",
    whyItMatters: "If the problem is fuzzy, the rule change will feel unearned.",
    recipe: fieldConfigs.problem.recipe,
    starters: fieldConfigs.problem.starters,
    weakExample: fieldConfigs.problem.weakExample,
    strongExample: fieldConfigs.problem.strongExample
  },
  currentRule: {
    id: "currentRule",
    shortTitle: "Current rule",
    title: "Explain the current rule",
    fieldIds: ["currentRuleContext"],
    requiredFieldIds: ["currentRuleContext"],
    rightNow: "Explain what the league does today before you argue for a change.",
    whyItMatters: "A reader needs the current rule context before they can judge the reform.",
    recipe: fieldConfigs.currentRuleContext.recipe,
    starters: fieldConfigs.currentRuleContext.starters,
    weakExample: fieldConfigs.currentRuleContext.weakExample,
    strongExample: fieldConfigs.currentRuleContext.strongExample
  },
  reform: {
    id: "reform",
    shortTitle: "Reform",
    title: "State the reform",
    fieldIds: ["proposedChange"],
    requiredFieldIds: ["proposedChange"],
    rightNow: "Write the rule change as a decision the league could actually adopt.",
    whyItMatters: "This step turns a complaint into a usable reform idea.",
    recipe: fieldConfigs.proposedChange.recipe,
    starters: fieldConfigs.proposedChange.starters,
    weakExample: fieldConfigs.proposedChange.weakExample,
    strongExample: fieldConfigs.proposedChange.strongExample
  },
  impact: {
    id: "impact",
    shortTitle: "Impact",
    title: "Predict who it helps",
    fieldIds: ["expectedImpact"],
    requiredFieldIds: ["expectedImpact"],
    rightNow: "Show who gains, who loses flexibility, and why the balance shifts.",
    whyItMatters: "A proposal is only credible if it predicts consequences, not just intentions.",
    recipe: fieldConfigs.expectedImpact.recipe,
    starters: fieldConfigs.expectedImpact.starters,
    weakExample: fieldConfigs.expectedImpact.weakExample,
    strongExample: fieldConfigs.expectedImpact.strongExample
  },
  tradeoffs: {
    id: "tradeoffs",
    shortTitle: "Tradeoffs",
    title: "Admit the tradeoffs",
    fieldIds: ["tradeoffs"],
    requiredFieldIds: ["tradeoffs"],
    rightNow: "Explain what gets harder if your reform is adopted.",
    whyItMatters: "Strong policy writing sounds honest because it does not hide the cost of the decision.",
    recipe: fieldConfigs.tradeoffs.recipe,
    starters: fieldConfigs.tradeoffs.starters,
    weakExample: fieldConfigs.tradeoffs.weakExample,
    strongExample: fieldConfigs.tradeoffs.strongExample
  },
  action: {
    id: "action",
    shortTitle: "Action",
    title: "Write the action",
    fieldIds: ["recommendation", "methodsSummary"],
    requiredFieldIds: ["recommendation"],
    rightNow: "End with the exact action the league should take and how you studied the proposal.",
    whyItMatters: "A memo should finish with a decision, not an open-ended conversation.",
    recipe: fieldConfigs.recommendation.recipe,
    starters: fieldConfigs.recommendation.starters,
    weakExample: fieldConfigs.recommendation.weakExample,
    strongExample: fieldConfigs.recommendation.strongExample
  },
  sandbox: {
    id: "sandbox",
    shortTitle: "Sandbox",
    title: "Test the rule",
    fieldIds: ["diffJson", "sandboxResult", "sandboxInterpretation"],
    requiredFieldIds: ["diffJson", "sandboxResult", "sandboxInterpretation"],
    rightNow: "Turn the idea into a valid rule diff, run the model, and explain what the evidence means.",
    whyItMatters: "This is where the memo stops being opinion alone and starts using model evidence.",
    recipe: fieldConfigs.diffJson.recipe,
    starters: fieldConfigs.diffJson.starters,
    weakExample: fieldConfigs.diffJson.weakExample,
    strongExample: fieldConfigs.diffJson.strongExample
  },
  review: {
    id: "review",
    shortTitle: "Review",
    title: "Polish for publication",
    fieldIds: ["references", "keywords", "keyTakeaways", "publicationSlug"],
    requiredFieldIds: [],
    rightNow: "Finish the publication details and fix every blocker before you submit.",
    whyItMatters: "This step makes the memo readable, reviewable, and publishable.",
    recipe: [
      "Clear every blocker before submitting.",
      "Add references and publication details if they strengthen the memo.",
      "Use the review buckets like an editor's checklist."
    ],
    starters: fieldConfigs.references.starters,
    weakExample: "Submit without checking whether the evidence and writing match.",
    strongExample: "Submit only after the blocker list is empty and the memo reads cleanly."
  }
};

export function createInitialProposalCoachValues(initial?: Partial<ProposalCoachValues>): ProposalCoachValues {
  return {
    title: initial?.title ?? "",
    issueId: initial?.issueId ?? "",
    ruleSetId: initial?.ruleSetId ?? "",
    abstract: initial?.abstract ?? "",
    methodsSummary: initial?.methodsSummary ?? "",
    problem: initial?.problem ?? "",
    currentRuleContext: initial?.currentRuleContext ?? "",
    proposedChange: initial?.proposedChange ?? "",
    expectedImpact: initial?.expectedImpact ?? "",
    tradeoffs: initial?.tradeoffs ?? "",
    sandboxInterpretation: initial?.sandboxInterpretation ?? "",
    recommendation: initial?.recommendation ?? "",
    diffJson: initial?.diffJson ?? defaultProposalDiffJson,
    references: initial?.references ?? "",
    keywords: initial?.keywords ?? "",
    keyTakeaways: initial?.keyTakeaways ?? "",
    publicationSlug: initial?.publicationSlug ?? ""
  };
}

export function getProposalCoachDomId(fieldId: ProposalCoachFieldId) {
  return `proposal-field-${fieldId}`;
}

export function isProposalCoachStepId(value: string | null | undefined): value is ProposalCoachStepId {
  return value ? proposalCoachStepOrder.includes(value as ProposalCoachStepId) : false;
}

export function getSandboxFingerprint(ruleSetId: string, diffJson: string) {
  if (!ruleSetId.trim()) {
    return null;
  }

  try {
    const parsed = parseRuleDiff(JSON.parse(diffJson) as RuleDiff);
    return `${ruleSetId}::${stableStringify(parsed)}`;
  } catch {
    return null;
  }
}

export function assessProposalCoach(
  values: ProposalCoachValues,
  sandboxState: ProposalCoachSandboxState
): ProposalCoachAssessment {
  const sandboxFingerprint = getSandboxFingerprint(values.ruleSetId, values.diffJson);
  const diffError = getDiffError(values.diffJson);
  const sandboxFreshness = getSandboxFreshness({
    hasResult: Boolean(sandboxState.result),
    runFingerprint: sandboxState.runFingerprint,
    currentFingerprint: sandboxFingerprint,
    diffError
  });

  const fields = {
    issueId: evaluateIssueField(values.issueId),
    ruleSetId: evaluateRulesetField(values.ruleSetId),
    title: evaluateTitleField(values.title),
    abstract: evaluateAbstractField(values.abstract),
    problem: evaluateProblemField(values.problem),
    currentRuleContext: evaluateCurrentRuleField(values.currentRuleContext),
    proposedChange: evaluateProposedChangeField(values.proposedChange),
    expectedImpact: evaluateImpactField(values.expectedImpact),
    tradeoffs: evaluateTradeoffsField(values.tradeoffs),
    recommendation: evaluateRecommendationField(values.recommendation),
    methodsSummary: evaluateMethodsField(values.methodsSummary),
    diffJson: evaluateDiffField(values.diffJson),
    sandboxResult: evaluateSandboxResultField(sandboxFreshness),
    sandboxInterpretation: evaluateSandboxInterpretationField(values.sandboxInterpretation),
    references: evaluateReferencesField(values.references),
    keywords: evaluateKeywordsField(values.keywords),
    keyTakeaways: evaluateTakeawaysField(values.keyTakeaways),
    publicationSlug: evaluateSlugField(values.publicationSlug)
  } satisfies Record<ProposalCoachFieldId, ProposalCoachFieldEvaluation>;

  const steps = buildStepEvaluations(values, fields);
  const firstIncompleteStepId = getFirstIncompleteStepId(steps);
  const reviewBuckets = buildReviewBuckets(fields, steps, sandboxFreshness);
  const submitReady = reviewBuckets.blockers.items.length === 0;
  const nextAction = steps[firstIncompleteStepId].nextMove;

  return {
    fields,
    steps,
    stepOrder: proposalCoachStepOrder,
    reviewBuckets,
    firstIncompleteStepId,
    nextAction,
    submitReady,
    sandboxFreshness,
    sandboxFingerprint,
    diffError
  };
}

export function getFirstIncompleteStepId(
  steps: Record<ProposalCoachStepId, ProposalCoachStepEvaluation>
) {
  return proposalCoachStepOrder.find((stepId) => !steps[stepId].complete) ?? "review";
}

export function getStepStatusLabel(status: ProposalCoachStepStatus) {
  switch (status) {
    case "done":
      return "Done";
    case "strong":
      return "Strong";
    case "needs_work":
      return "Needs work";
    default:
      return "Not started";
  }
}

export function getFieldStateLabel(state: ProposalCoachFieldState) {
  switch (state) {
    case "ready":
      return "Ready";
    case "strong":
      return "Strong";
    case "developing":
      return "Developing";
    case "starting":
      return "Starting";
    default:
      return "Empty";
  }
}

function getSandboxFreshness(params: {
  hasResult: boolean;
  runFingerprint: string | null;
  currentFingerprint: string | null;
  diffError: string | null;
}): SandboxFreshnessState {
  if (params.diffError) {
    return "invalid";
  }

  if (!params.hasResult) {
    return "idle";
  }

  if (params.runFingerprint && params.currentFingerprint && params.runFingerprint === params.currentFingerprint) {
    return "fresh";
  }

  return "stale";
}

function getDiffError(value: string) {
  try {
    parseRuleDiff(JSON.parse(value) as RuleDiff);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "The rule diff is not valid JSON yet.";
  }
}

function buildStepEvaluations(
  values: ProposalCoachValues,
  fields: Record<ProposalCoachFieldId, ProposalCoachFieldEvaluation>
) {
  const stepMap = {} as Record<ProposalCoachStepId, ProposalCoachStepEvaluation>;

  for (const stepId of proposalCoachStepOrder) {
    const definition = proposalCoachSteps[stepId];
    const stepFieldEvaluations = definition.fieldIds.map((fieldId) => fields[fieldId]);
    const requiredFieldEvaluations = definition.requiredFieldIds.map((fieldId) => fields[fieldId]);
    const hasAnyContent =
      stepId === "sandbox"
        ? stepFieldEvaluations.some((field) => hasFieldContent(field.fieldId, values))
        : definition.fieldIds.some((fieldId) => hasFieldContent(fieldId, values));
    const complete = requiredFieldEvaluations.every((field) => field.complete);
    const allReady = stepFieldEvaluations.every((field) => field.state === "ready");
    const missingItems = requiredFieldEvaluations
      .filter((field) => !field.complete)
      .map((field) => field.nextMove);

    let status: ProposalCoachStepStatus;

    if (!hasAnyContent) {
      status = "not_started";
    } else if (complete && allReady) {
      status = "done";
    } else if (complete) {
      status = "strong";
    } else {
      status = "needs_work";
    }

    stepMap[stepId] = {
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

  const reviewOptionalFields = proposalCoachSteps.review.fieldIds.map((fieldId) => fields[fieldId]);
  stepMap.review = {
    ...stepMap.review,
    status:
      stepMap.review.complete && reviewOptionalFields.every((field) => field.state === "empty" || field.state === "ready")
        ? "done"
        : stepMap.review.complete
          ? "strong"
          : stepMap.review.hasAnyContent
            ? "needs_work"
            : "not_started",
    nextMove: stepMap.review.missingItems[0] ?? "Read the review buckets and clear every blocker before submitting."
  };

  return stepMap;
}

function buildReviewBuckets(
  fields: Record<ProposalCoachFieldId, ProposalCoachFieldEvaluation>,
  steps: Record<ProposalCoachStepId, ProposalCoachStepEvaluation>,
  sandboxFreshness: SandboxFreshnessState
) {
  const blockers = Object.values(fields)
    .filter((field) => field.required && !field.complete)
    .map((field) => `${field.label}: ${field.nextMove}`);

  if (sandboxFreshness === "stale") {
    blockers.unshift("Sandbox evidence: You changed the rule after the last sandbox run. Test it again so your evidence matches your proposal.");
  }

  const polish = Object.values(fields)
    .filter((field) => !field.required)
    .filter((field) => field.state !== "ready")
    .map((field) => `${field.label}: ${field.nextMove}`);

  const strengths = proposalCoachStepOrder
    .filter((stepId) => steps[stepId].status === "done" || steps[stepId].status === "strong")
    .map((stepId) => `${proposalCoachSteps[stepId].title} looks strong.`);

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

function hasFieldContent(fieldId: ProposalCoachFieldId, values: ProposalCoachValues) {
  switch (fieldId) {
    case "sandboxResult":
      return false;
    default:
      return values[fieldId].trim().length > 0;
  }
}

function baseFieldEvaluation(config: FieldConfig) {
  return {
    fieldId: config.id,
    label: config.label,
    stepId: config.stepId,
    required: config.required,
    recipe: config.recipe,
    starters: config.starters,
    missingIngredients: [] as string[],
    weakExample: config.weakExample,
    strongExample: config.strongExample
  };
}

function evaluateIssueField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.issueId);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Pick the live issue this memo is trying to solve.",
      nextMove: "Choose the issue that best matches the rule pressure you want to fix.",
      missingIngredients: ["Select one issue."]
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Good. The memo now has a real league problem to anchor it.",
    nextMove: "Next, pick the exact baseline ruleset you want to change."
  };
}

function evaluateRulesetField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.ruleSetId);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Pick the ruleset baseline before you describe the reform.",
      nextMove: "Choose the RuleSet version that your proposal wants to change.",
      missingIngredients: ["Select one baseline ruleset."]
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Good. Your proposal now has a clear baseline for comparison.",
    nextMove: "Next, name the decision so a reader knows what this memo is about."
  };
}

function evaluateTitleField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.title);
  const words = countWords(value);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Name the rule decision, not just the topic.",
      nextMove: "Add a title that tells the reader what rule should change.",
      missingIngredients: ["State the decision.", "Name the rule or mechanism."]
    };
  }

  if (words < 4 || value.trim().length < 12) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "This names the topic, but not the action yet.",
      nextMove: "Add what should change so the title sounds like a decision.",
      missingIngredients: ["Include the action.", "Be more specific."]
    };
  }

  if (!actionVerbPattern.test(value)) {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "The title is clearer, but it still reads more like a topic than a decision.",
      nextMove: "Use an action verb such as raise, revise, replace, or protect.",
      missingIngredients: ["Add the action the league should take."]
    };
  }

  if (value.trim().length < 26) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. A reader can tell what reform is being considered.",
      nextMove: "If you want, tighten one more phrase so the title sounds even more specific."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The title frames a specific decision right away.",
    nextMove: "Next, say the whole idea fast in the opening summary."
  };
}

function evaluateAbstractField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.abstract);
  const words = countWords(value);
  const mentionsAction = actionVerbPattern.test(value);
  const mentionsEffect = /\b(effect|impact|result|would|could|because|helps?|hurts?|pressure)\b/i.test(value);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Summarize the problem, the reform, and the likely result in a quick opening.",
      nextMove: "Write two or three calm sentences that cover the whole memo.",
      missingIngredients: ["Name the problem.", "Name the reform.", "Name the likely result."]
    };
  }

  if (words < 10) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "This is a start, but the reader still cannot see the whole memo yet.",
      nextMove: "Add one sentence for the problem, one for the reform, and one for the likely effect.",
      missingIngredients: ["Add more detail.", "Cover the likely result."]
    };
  }

  if (!mentionsAction || !mentionsEffect) {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "The summary has the topic, but it still needs the reform and its likely effect.",
      nextMove: "Add the change you recommend and what you expect it to do.",
      missingIngredients: ["Name the reform.", "Name the likely effect."]
    };
  }

  if (words < 30) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. A reader can follow the memo's shape from this opening.",
      nextMove: "Next, slow down and explain the problem in full."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The opening gives the whole memo in miniature.",
    nextMove: "Next, explain the league problem in full."
  };
}

function evaluateProblemField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.problem);
  const words = countWords(value);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Explain what is going wrong in the league.",
      nextMove: "Name the pressure point and who it affects.",
      missingIngredients: ["Describe the problem.", "Say who is affected."]
    };
  }

  if (words < 14) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "You named the issue, but the reader still needs more detail.",
      nextMove: "Add why this problem matters and who gets squeezed by it.",
      missingIngredients: ["Explain why it matters.", "Add the affected group."]
    };
  }

  if (!affectedGroupPattern.test(value)) {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "The problem is visible, but the reader still does not know who feels it most.",
      nextMove: "Add the group that gains the pressure or loses flexibility.",
      missingIngredients: ["Name the affected group."]
    };
  }

  if (words < 42) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. The problem is clear and grounded in the league.",
      nextMove: "Next, explain what the current rule does now."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The problem is specific, important, and easy to picture.",
    nextMove: "Next, explain the current rule before you argue for change."
  };
}

function evaluateCurrentRuleField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.currentRuleContext);
  const words = countWords(value);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Explain what the league does today before you argue for change.",
      nextMove: "Describe the current rule and the pressure it creates.",
      missingIngredients: ["Describe the current rule.", "Show the present pressure."]
    };
  }

  if (words < 12) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "This mentions the rules, but not clearly enough yet.",
      nextMove: "Add one more sentence that explains how the rule works today.",
      missingIngredients: ["Clarify how the rule works."]
    };
  }

  if (!ruleContextPattern.test(value)) {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "The reader still needs a clearer picture of the current rule system.",
      nextMove: "Use words like current, threshold, tax, sharing, or existing rule to anchor the explanation.",
      missingIngredients: ["Describe the current rule more concretely."]
    };
  }

  if (words < 36) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. A reader can now see the current baseline.",
      nextMove: "Next, state the reform as a decision the league could actually adopt."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The current rule context is clear enough to support the reform argument.",
    nextMove: "Next, state the reform clearly."
  };
}

function evaluateProposedChangeField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.proposedChange);
  const words = countWords(value);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Write the rule change as a decision the league could actually adopt.",
      nextMove: "State exactly what rule should become different.",
      missingIngredients: ["Name the rule change."]
    };
  }

  if (words < 10) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "This sounds like a goal, not a full reform yet.",
      nextMove: "Add the exact change the league should make.",
      missingIngredients: ["Describe the concrete change."]
    };
  }

  if (!actionVerbPattern.test(value)) {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "This still sounds like a direction, not a rule change the league could vote on.",
      nextMove: "Rewrite it with an action verb so the change sounds adoptable.",
      missingIngredients: ["Use a clear action verb."]
    };
  }

  if (words < 28) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. The reform sounds like a real decision now.",
      nextMove: "Next, show who the change would help and who would lose flexibility."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The reform is concrete enough to translate into a rule diff.",
    nextMove: "Next, predict who it helps and why."
  };
}

function evaluateImpactField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.expectedImpact);
  const words = countWords(value);
  const hasGroups = affectedGroupPattern.test(value);
  const hasBenefit = /\b(gain|benefit|help|improve|protect|increase|stabilize|support)\b/i.test(value);
  const hasLoss = /\b(lose|cost|pressure|limit|harder|reduce|sacrifice|constraint)\b/i.test(value);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Show who gains, who loses flexibility, and why the balance shifts.",
      nextMove: "Name the main winner, the main loser, and the reason the pressure changes.",
      missingIngredients: ["Name who gains.", "Name who loses flexibility."]
    };
  }

  if (words < 12) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "The impact is starting to appear, but it is still too thin.",
      nextMove: "Add one sentence for who benefits and one sentence for who gives something up.",
      missingIngredients: ["Add the likely winner.", "Add the likely loser."]
    };
  }

  if (!hasGroups || !hasBenefit || !hasLoss) {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "You have the direction, but the impact still needs winners, losers, and a clear reason.",
      nextMove: "Say who gains, who loses leverage, and why the balance moves.",
      missingIngredients: ["Name the groups.", "Show the benefit and the cost."]
    };
  }

  if (words < 34) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. The likely effects are concrete and believable.",
      nextMove: "Next, admit the tradeoffs honestly."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The impact analysis shows a real shift in league incentives.",
    nextMove: "Next, explain the tradeoffs."
  };
}

function evaluateTradeoffsField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.tradeoffs);
  const words = countWords(value);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Show what might get worse, not just what gets better.",
      nextMove: "Name the downside your reform creates.",
      missingIngredients: ["State the main downside."]
    };
  }

  if (words < 10) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "The tradeoff is only hinted at so far.",
      nextMove: "Add one sentence that names the cost or new pressure.",
      missingIngredients: ["Explain the downside clearly."]
    };
  }

  if (!contrastPattern.test(value)) {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "This still reads more like another benefit than a real tradeoff.",
      nextMove: "Use language that shows cost, risk, pressure, or lost flexibility.",
      missingIngredients: ["Show what gets harder."]
    };
  }

  if (words < 28) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. The memo sounds honest because the tradeoff is visible.",
      nextMove: "Next, write the final recommendation."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The tradeoff feels real and policy-minded.",
    nextMove: "Next, write the action the league should take."
  };
}

function evaluateRecommendationField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.recommendation);
  const words = countWords(value);
  const namesActor = /\b(league|commissioner|board|owners|teams)\b/i.test(value);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "End with the exact action the league should take.",
      nextMove: "Write one sentence that says who should do what next.",
      missingIngredients: ["Name the actor.", "State the action."]
    };
  }

  if (words < 8) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "This still feels too short to guide a decision-maker.",
      nextMove: "Add the actor and the action so it sounds like a real recommendation.",
      missingIngredients: ["Name the actor.", "State the action more clearly."]
    };
  }

  if (!actionVerbPattern.test(value) || !namesActor) {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "The recommendation is present, but it still needs a clearer actor or decision verb.",
      nextMove: "Name who should act and what exact action they should take.",
      missingIngredients: ["Add the actor or action verb."]
    };
  }

  if (words < 24) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. The memo now ends with a real decision.",
      nextMove: "If you want, add a short methods line about how you studied the proposal."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The recommendation is concrete and decision-ready.",
    nextMove: "Next, show how you studied the proposal and then test it in the sandbox."
  };
}

function evaluateMethodsField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.methodsSummary);
  const words = countWords(value);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Optional, but useful: say how you studied the proposal.",
      nextMove: "Add one sentence about the baseline rules, the diff, or the sandbox."
    };
  }

  if (words < 8) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "The method is mentioned, but it still needs one more concrete detail.",
      nextMove: "Say what you compared or what tool you used."
    };
  }

  if (!/\b(compare|sandbox|ruleset|diff|model|study|analy[sz]e)\b/i.test(value)) {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "The methods line exists, but it does not yet say how the study actually worked.",
      nextMove: "Mention the ruleset comparison, the rule diff, or the sandbox model."
    };
  }

  if (words < 22) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. The methods line gives the reader enough process detail.",
      nextMove: "Next, turn the reform into a valid rule diff."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The memo explains the study method clearly and briefly.",
    nextMove: "Next, turn the reform into a valid rule diff."
  };
}

function evaluateDiffField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.diffJson);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "The model cannot run until the rule change is in usable JSON.",
      nextMove: "Add a JSON object with a changes array.",
      missingIngredients: ["Create a changes array."]
    };
  }

  try {
    const parsed = parseRuleDiff(JSON.parse(value) as RuleDiff);

    if (parsed.changes.length === 0) {
      return {
        ...base,
        state: "developing" as const,
        complete: false,
        message: "The JSON is valid, but it still does not change any rule.",
        nextMove: "Add at least one rule change inside the changes array.",
        missingIngredients: ["Add at least one change."]
      };
    }

    const missingReason = parsed.changes.some((change) => !change.reason || change.reason.trim().length < 4);

    if (missingReason) {
      return {
        ...base,
        state: "strong" as const,
        complete: true,
        message: "Good. The diff is valid and the model can use it.",
        nextMove: "Add a reason to each change if you want the evidence trail to read more clearly."
      };
    }

    return {
      ...base,
      state: "ready" as const,
      complete: true,
      message: "Excellent. The diff is valid and specific enough for the sandbox.",
      nextMove: "Run the sandbox so the memo has model evidence."
    };
  } catch (error) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "The model cannot run yet because the rule change is not in usable JSON.",
      nextMove: error instanceof Error ? error.message : "Fix the JSON so the diff parses.",
      missingIngredients: [error instanceof Error ? error.message : "Fix the JSON format."]
    };
  }
}

function evaluateSandboxResultField(state: SandboxFreshnessState) {
  const base = baseFieldEvaluation(fieldConfigs.sandboxResult);

  if (state === "invalid") {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "Fix the rule diff before you try to run the sandbox.",
      nextMove: "Make the diff valid JSON first.",
      missingIngredients: ["Valid diff required."]
    };
  }

  if (state === "idle") {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Run the sandbox so your memo uses evidence, not only opinion.",
      nextMove: "Run the sandbox after the diff is stable.",
      missingIngredients: ["Run the sandbox."]
    };
  }

  if (state === "stale") {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "You changed the rule after the last run. Test it again so the evidence matches the proposal.",
      nextMove: "Run the sandbox again with the current ruleset and diff.",
      missingIngredients: ["Refresh the sandbox result."]
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Good. The memo now has fresh model evidence.",
    nextMove: "Now explain what the evidence means for a decision-maker."
  };
}

function evaluateSandboxInterpretationField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.sandboxInterpretation);
  const words = countWords(value);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Explain what the sandbox results mean for the league.",
      nextMove: "Write what the evidence suggests a decision-maker should notice.",
      missingIngredients: ["Interpret the evidence."]
    };
  }

  if (words < 10) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "This repeats the result, but it does not interpret it yet.",
      nextMove: "Add what the numbers mean for league behavior or policy.",
      missingIngredients: ["Explain the meaning of the result."]
    };
  }

  if (!interpretationPattern.test(value)) {
    return {
      ...base,
      state: "developing" as const,
      complete: false,
      message: "Do not just repeat the numbers. Explain what they mean for a decision-maker.",
      nextMove: "Use words like means, suggests, because, or should to interpret the evidence.",
      missingIngredients: ["Add interpretation language."]
    };
  }

  if (words < 30) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. The evidence now has meaning, not just numbers.",
      nextMove: "Next, polish the memo for publication and clear the blocker list."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The interpretation translates the model into policy meaning.",
    nextMove: "Next, polish the memo for publication."
  };
}

function evaluateReferencesField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.references);
  const count = parseStringList(value).length;

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Optional, but useful: add at least one reference a reader could follow.",
      nextMove: "Add one source line if you want the memo to feel more anchored."
    };
  }

  if (count < 1) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "The reference area has text, but it does not yet look like a usable source line.",
      nextMove: "Use the format Label | URL | TYPE | note."
    };
  }

  if (count < 2) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. There is at least one usable source behind the memo.",
      nextMove: "If you want, add another source to strengthen the evidence trail."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The memo has a clear evidence trail.",
    nextMove: "Review the final blocker list before you submit."
  };
}

function evaluateKeywordsField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.keywords);
  const count = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean).length;

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Optional, but useful: add search-friendly keywords.",
      nextMove: "Add a few plain-language topic words if you want the memo easier to index."
    };
  }

  if (count < 2) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "The keywords are starting to help, but they are still thin.",
      nextMove: "Add two or three specific topic phrases."
    };
  }

  if (count < 4) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. The memo has usable indexing words.",
      nextMove: "If you want, add one more keyword phrase to sharpen searchability."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The keywords are specific and useful.",
    nextMove: "Review the final blocker list before you submit."
  };
}

function evaluateTakeawaysField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.keyTakeaways);
  const count = parseStringList(value).length;

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Optional, but helpful: add takeaway lines a reader could skim.",
      nextMove: "Add one or two short takeaway lines if you want the memo to read faster."
    };
  }

  if (count < 2) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "You have a takeaway, but one more line would make the memo easier to skim.",
      nextMove: "Add another standalone takeaway sentence."
    };
  }

  if (count < 3) {
    return {
      ...base,
      state: "strong" as const,
      complete: true,
      message: "Good. The memo now has quick takeaway lines.",
      nextMove: "If you want, add a third line that captures the tradeoff or evidence."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Excellent. The takeaway lines make the memo easy to skim.",
    nextMove: "Review the final blocker list before you submit."
  };
}

function evaluateSlugField(value: string) {
  const base = baseFieldEvaluation(fieldConfigs.publicationSlug);

  if (!value.trim()) {
    return {
      ...base,
      state: "empty" as const,
      complete: false,
      message: "Optional: add a custom publication slug if you want a specific URL shape.",
      nextMove: "Leave this blank unless you want a custom slug."
    };
  }

  if (!/^[a-z0-9-]+$/.test(value.trim())) {
    return {
      ...base,
      state: "starting" as const,
      complete: false,
      message: "The slug should use lowercase letters, numbers, and dashes only.",
      nextMove: "Remove spaces, uppercase letters, and punctuation."
    };
  }

  return {
    ...base,
    state: "ready" as const,
    complete: true,
    message: "Good. The custom slug is publication-ready.",
    nextMove: "Review the final blocker list before you submit."
  };
}

function countWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }

  return JSON.stringify(value);
}
