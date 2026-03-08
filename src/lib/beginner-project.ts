import type { ProjectCoachValues } from "@/lib/project-wizard";
import { parseStringList } from "@/lib/utils";
import type { ProjectRepairFieldId } from "@/lib/student-flow";

export type BeginnerProjectStepId =
  | "issue"
  | "lane"
  | "question"
  | "context"
  | "evidence"
  | "analysis"
  | "recommendations"
  | "title"
  | "references"
  | "review";

export const beginnerProjectStepOrder: BeginnerProjectStepId[] = [
  "issue",
  "lane",
  "question",
  "context",
  "evidence",
  "analysis",
  "recommendations",
  "title",
  "references",
  "review"
];

function withSentence(prefix: string, value: string, fallback: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return `${prefix} ${trimmed}`.trim();
}

export function getBeginnerStepIdForField(fieldId: ProjectRepairFieldId): BeginnerProjectStepId {
  switch (fieldId) {
    case "issueIds":
      return "issue";
    case "lanePrimary":
      return "lane";
    case "essentialQuestion":
    case "methodsSummary":
      return "question";
    case "context":
      return "context";
    case "evidence":
      return "evidence";
    case "analysis":
      return "analysis";
    case "recommendations":
      return "recommendations";
    case "title":
    case "summary":
    case "abstract":
      return "title";
    case "references":
      return "references";
    default:
      return "analysis";
  }
}

export function getFirstIncompleteBeginnerStep(values: ProjectCoachValues): BeginnerProjectStepId {
  for (const stepId of beginnerProjectStepOrder) {
    if (!isBeginnerStepComplete(stepId, values)) {
      return stepId;
    }
  }

  return "review";
}

export function isBeginnerStepComplete(
  stepId: BeginnerProjectStepId,
  values: ProjectCoachValues
) {
  switch (stepId) {
    case "issue":
      return values.issueIds.length > 0;
    case "lane":
      return Boolean(values.lanePrimary);
    case "question":
      return values.essentialQuestion.trim().length >= 8;
    case "context":
      return values.context.trim().length >= 16;
    case "evidence":
      return values.evidence.trim().length >= 16;
    case "analysis":
      return values.analysis.trim().length >= 16;
    case "recommendations":
      return values.recommendations.trim().length >= 12;
    case "title":
      return values.title.trim().length >= 12;
    case "references":
      return parseStringList(values.references).length > 0;
    default:
      return true;
  }
}

export function beginnerStepHasAnyContent(
  stepId: BeginnerProjectStepId,
  values: ProjectCoachValues
) {
  switch (stepId) {
    case "issue":
      return values.issueIds.length > 0;
    case "lane":
      return Boolean(values.lanePrimary);
    case "question":
      return values.essentialQuestion.trim().length > 0;
    case "context":
      return values.context.trim().length > 0;
    case "evidence":
      return values.evidence.trim().length > 0;
    case "analysis":
      return values.analysis.trim().length > 0;
    case "recommendations":
      return values.recommendations.trim().length > 0;
    case "title":
      return values.title.trim().length > 0;
    case "references":
      return values.references.trim().length > 0;
    default:
      return true;
  }
}

export function buildBeginnerDerivedFields(input: {
  issueTitle: string;
  values: Pick<
    ProjectCoachValues,
    | "lanePrimary"
    | "title"
    | "essentialQuestion"
    | "context"
    | "evidence"
    | "analysis"
    | "recommendations"
  >;
}) {
  const issueTitle = input.issueTitle.trim() || "this league issue";
  const question =
    input.values.essentialQuestion.trim() || `how ${issueTitle.toLowerCase()} is affecting the league`;
  const methodsSummary = withSentence(
    "This project uses league issue notes and saved evidence to study",
    question,
    `This project uses league issue notes and saved evidence to study ${issueTitle}.`
  );
  const overview = withSentence(
    `This project focuses on ${issueTitle} because`,
    input.values.context,
    `This project focuses on ${issueTitle} because it is putting real pressure on the league right now.`
  );
  const summary = withSentence(
    `This project asks ${question}. It studies ${issueTitle} and argues that`,
    input.values.recommendations,
    `This project asks ${question}. It studies ${issueTitle} and explains what should happen next.`
  );
  const abstract = [
    summary,
    withSentence(
      "The main evidence is",
      input.values.evidence,
      `The main evidence is still being gathered around ${issueTitle}.`
    ),
    withSentence(
      "This evidence matters because",
      input.values.analysis,
      "This evidence changes how a reader should understand the issue."
    )
  ].join(" ");

  const laneSections = buildBeginnerLaneSections({
    lanePrimary: input.values.lanePrimary,
    context: input.values.context,
    evidence: input.values.evidence,
    analysis: input.values.analysis,
    recommendations: input.values.recommendations
  });

  const findingsMd = [
    "## Overview",
    overview,
    "",
    "## Evidence",
    input.values.evidence.trim() || "Evidence notes are still in progress.",
    "",
    "## Analysis",
    input.values.analysis.trim() || "Analysis is still in progress.",
    "",
    "## Recommendations",
    input.values.recommendations.trim() || "Recommendations are still in progress."
  ].join("\n");

  return {
    methodsSummary,
    overview,
    summary,
    abstract,
    laneSections,
    findingsMd
  };
}

function buildBeginnerLaneSections(input: {
  lanePrimary: ProjectCoachValues["lanePrimary"];
  context: string;
  evidence: string;
  analysis: string;
  recommendations: string;
}) {
  switch (input.lanePrimary) {
    case "TOOL_BUILDERS":
      return [
        {
          key: "inputs",
          title: "Inputs and assumptions",
          prompt: "What information does the tool need before it can run?",
          value: withSentence(
            "The tool needs these inputs before it can help:",
            input.evidence,
            "The tool needs league data, issue notes, and a clear decision question before it can help."
          )
        },
        {
          key: "method",
          title: "How the tool works",
          prompt: "Explain the steps in plain language.",
          value: withSentence(
            "The tool should work like this:",
            input.analysis,
            "The tool should turn league inputs into a simple comparison a student can understand quickly."
          )
        },
        {
          key: "exampleOutput",
          title: "Example output",
          prompt: "Show what the tool produces and how to read it.",
          value: withSentence(
            "A student should be able to read the output and then",
            input.recommendations,
            "A student should be able to read the output and know what decision or next step it points to."
          )
        },
        {
          key: "limits",
          title: "Limits and risks",
          prompt: "Where could the tool oversimplify the league?",
          value: withSentence(
            "The main limit to watch is that",
            input.context,
            "The main limit to watch is that a tool can simplify a league problem that still needs human judgment."
          )
        }
      ];
    case "POLICY_REFORM_ARCHITECTS":
      return [
        {
          key: "currentRule",
          title: "Current rule context",
          prompt: "Which rule is creating pressure in the league right now?",
          value: withSentence(
            "The current rule pressure looks like this:",
            input.context,
            "The current rule pressure comes from a system that is forcing teams into hard tradeoffs."
          )
        },
        {
          key: "winnersLosers",
          title: "Expected winners and losers",
          prompt: "Who benefits and who loses flexibility if the rule changes?",
          value: withSentence(
            "The evidence suggests these winners and losers:",
            input.analysis,
            "The evidence suggests some teams gain breathing room while others lose a current advantage."
          )
        },
        {
          key: "tradeoffs",
          title: "Tradeoffs",
          prompt: "What new problem might your reform create?",
          value: withSentence(
            "The main tradeoff to watch next is that",
            input.recommendations,
            "The main tradeoff to watch next is that any reform can solve one pressure while creating another."
          )
        }
      ];
    case "STRATEGIC_OPERATORS":
      return [
        {
          key: "yearOne",
          title: "Year 1 plan",
          prompt: "What should happen first?",
          value: withSentence(
            "The first move should be:",
            input.recommendations,
            "The first move should be a low-risk action that gives the team more room to make later decisions."
          )
        },
        {
          key: "yearTwo",
          title: "Year 2 plan",
          prompt: "What changes after the first season?",
          value: withSentence(
            "After the first season, the plan should adjust because",
            input.analysis,
            "After the first season, the plan should adjust based on what the evidence says about the team's flexibility."
          )
        },
        {
          key: "yearThree",
          title: "Year 3 plan",
          prompt: "What outcome are you aiming for by the end of the window?",
          value: withSentence(
            "By year three, the team should be in a better spot because",
            input.context,
            "By year three, the team should be in a better spot because the early moves protected future choices."
          )
        },
        {
          key: "risks",
          title: "Risks and contingencies",
          prompt: "What could go wrong, and how would you respond?",
          value: withSentence(
            "The main risk in this plan is that",
            input.analysis,
            "The main risk in this plan is that the league pressure shifts faster than the team can respond."
          )
        }
      ];
    default:
      return [
        {
          key: "pattern",
          title: "Pattern discovered",
          prompt: "What trend or imbalance did you notice?",
          value: withSentence(
            "The strongest pattern in the evidence is that",
            input.evidence,
            "The strongest pattern in the evidence is that the league pressure is not hitting every team the same way."
          )
        },
        {
          key: "interpretation",
          title: "Interpretation",
          prompt: "Why does that pattern matter for the league?",
          value: withSentence(
            "This matters because",
            input.analysis,
            "This matters because it changes what a fair and workable league system should try to protect."
          )
        },
        {
          key: "nextQuestion",
          title: "Next question",
          prompt: "What should investigators test next?",
          value: withSentence(
            "The next question worth testing is",
            input.recommendations,
            "The next question worth testing is what change would lower the pressure without creating a new imbalance."
          )
        }
      ];
  }
}
