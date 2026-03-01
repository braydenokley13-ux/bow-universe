export type CoachFieldState = "empty" | "starting" | "developing" | "strong" | "ready";

export type CoachStepStatus = "not_started" | "needs_work" | "strong" | "done";

export type CoachFieldEvaluationLike = {
  state: CoachFieldState;
  message: string;
  nextMove: string;
  recipe: string[];
  starters: string[];
  missingIngredients: string[];
  weakExample: string;
  strongExample: string;
};

export type CoachStepDefinitionLike = {
  shortTitle: string;
  title: string;
  rightNow: string;
  whyItMatters: string;
  recipe: string[];
};

export type CoachStepEvaluationLike = {
  status: CoachStepStatus;
  nextMove: string;
};

export function getFieldStateLabel(state: CoachFieldState) {
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

export function getStepStatusLabel(status: CoachStepStatus) {
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
