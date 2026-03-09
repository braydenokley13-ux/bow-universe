import { ProjectType } from "@prisma/client";

import { FieldCoach } from "@/components/field-coach";
import {
  ProjectFieldBlock,
  ProjectStepLayout
} from "@/components/project-step-shared";
import { StepInput, StepTextarea } from "@/components/proposal-step-shared";
import { laneTagLabels, projectTypeLabels, type LaneTag, type LaneTemplateDefinition } from "@/lib/types";
import type {
  ProjectCoachFieldEvaluation,
  ProjectCoachLaneSectionEvaluation,
  ProjectCoachReviewBucket,
  ProjectCoachStepDefinition,
  ProjectCoachStepEvaluation
} from "@/lib/project-wizard";

const laneOrder: LaneTag[] = [
  "TOOL_BUILDERS",
  "POLICY_REFORM_ARCHITECTS",
  "STRATEGIC_OPERATORS",
  "ECONOMIC_INVESTIGATORS"
];

type StepCommonProps = {
  step: ProjectCoachStepDefinition;
  evaluation: ProjectCoachStepEvaluation;
  warningItems?: string[];
};

type ProjectStepLaneProps = StepCommonProps & {
  laneEvaluation: ProjectCoachFieldEvaluation;
  projectTypeEvaluation: ProjectCoachFieldEvaluation;
  laneTagsEvaluation: ProjectCoachFieldEvaluation;
  lanePrimary: LaneTag;
  projectType: ProjectType;
  laneTemplate: LaneTemplateDefinition;
  laneTags: LaneTag[];
  currentOutputLabel: string;
  onChangeLane: (value: LaneTag) => void;
  onChangeProjectType: (value: ProjectType) => void;
  onToggleLaneTag: (value: LaneTag) => void;
};

type ProjectStepContextProps = StepCommonProps & {
  issueEvaluation: ProjectCoachFieldEvaluation;
  teamEvaluation: ProjectCoachFieldEvaluation;
  proposalEvaluation: ProjectCoachFieldEvaluation;
  collaboratorEvaluation: ProjectCoachFieldEvaluation;
  issues: Array<{ id: string; title: string; description: string; severity: number }>;
  teams: Array<{ id: string; name: string }>;
  proposals: Array<{ id: string; title: string; issue: { title: string } }>;
  users: Array<{ id: string; name: string }>;
  viewerId: string;
  issueId: string;
  teamId: string;
  supportingProposalId: string;
  collaboratorIds: string[];
  onChangeIssue: (value: string) => void;
  onChangeTeam: (value: string) => void;
  onChangeSupportingProposal: (value: string) => void;
  onToggleCollaborator: (value: string) => void;
};

type ProjectStepOpeningProps = StepCommonProps & {
  titleEvaluation: ProjectCoachFieldEvaluation;
  summaryEvaluation: ProjectCoachFieldEvaluation;
  abstractEvaluation: ProjectCoachFieldEvaluation;
  title: string;
  summary: string;
  abstract: string;
  onChangeTitle: (value: string) => void;
  onChangeSummary: (value: string) => void;
  onChangeAbstract: (value: string) => void;
  onUseTitleStarter: (value: string) => void;
  onUseSummaryStarter: (value: string) => void;
  onUseAbstractStarter: (value: string) => void;
};

type ProjectStepMissionProps = StepCommonProps & {
  questionEvaluation: ProjectCoachFieldEvaluation;
  methodsEvaluation: ProjectCoachFieldEvaluation;
  essentialQuestion: string;
  methodsSummary: string;
  onChangeQuestion: (value: string) => void;
  onChangeMethods: (value: string) => void;
  onUseQuestionStarter: (value: string) => void;
  onUseMethodsStarter: (value: string) => void;
};

type ProjectStepBodyProps = StepCommonProps & {
  overviewEvaluation: ProjectCoachFieldEvaluation;
  contextEvaluation: ProjectCoachFieldEvaluation;
  evidenceEvaluation: ProjectCoachFieldEvaluation;
  analysisEvaluation: ProjectCoachFieldEvaluation;
  recommendationEvaluation: ProjectCoachFieldEvaluation;
  overviewLabel: string;
  overview: string;
  context: string;
  evidence: string;
  analysis: string;
  recommendations: string;
  onChangeOverview: (value: string) => void;
  onChangeContext: (value: string) => void;
  onChangeEvidence: (value: string) => void;
  onChangeAnalysis: (value: string) => void;
  onChangeRecommendations: (value: string) => void;
  onUseOverviewStarter: (value: string) => void;
  onUseContextStarter: (value: string) => void;
  onUseEvidenceStarter: (value: string) => void;
  onUseAnalysisStarter: (value: string) => void;
  onUseRecommendationStarter: (value: string) => void;
};

type ProjectStepLaneSectionsProps = StepCommonProps & {
  laneSectionsEvaluation: ProjectCoachFieldEvaluation;
  sectionEvaluations: ProjectCoachLaneSectionEvaluation[];
  laneSections: Array<{ key: string; title: string; prompt: string; value: string }>;
  outputLabel: string;
  onChangeSection: (key: string, value: string) => void;
  onUseSectionStarter: (key: string, starter: string) => void;
};

type ProjectStepPublishProps = StepCommonProps & {
  artifactEvaluation: ProjectCoachFieldEvaluation;
  referencesEvaluation: ProjectCoachFieldEvaluation;
  keywordsEvaluation: ProjectCoachFieldEvaluation;
  takeawaysEvaluation: ProjectCoachFieldEvaluation;
  slugEvaluation: ProjectCoachFieldEvaluation;
  reflectionEvaluation: ProjectCoachFieldEvaluation;
  artifactLinks: string;
  references: string;
  keywords: string;
  keyTakeaways: string;
  publicationSlug: string;
  reflection: string;
  onChangeArtifactLinks: (value: string) => void;
  onChangeReferences: (value: string) => void;
  onChangeKeywords: (value: string) => void;
  onChangeTakeaways: (value: string) => void;
  onChangeSlug: (value: string) => void;
  onChangeReflection: (value: string) => void;
  onUseArtifactStarter: (value: string) => void;
  onUseReferencesStarter: (value: string) => void;
  onUseKeywordsStarter: (value: string) => void;
  onUseTakeawayStarter: (value: string) => void;
  onUseSlugStarter: (value: string) => void;
  onUseReflectionStarter: (value: string) => void;
};

type ProjectStepReviewProps = StepCommonProps & {
  findingsEvaluation: ProjectCoachFieldEvaluation;
  findingsMd: string;
  blockers: ProjectCoachReviewBucket;
  polish: ProjectCoachReviewBucket;
  strengths: ProjectCoachReviewBucket;
  laneTemplate: LaneTemplateDefinition;
  onChangeFindings: (value: string) => void;
};

function ReviewBucket({ bucket }: { bucket: ProjectCoachReviewBucket }) {
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-4">
      <p className="font-medium text-ink">{bucket.title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
        {bucket.items.length > 0 ? (
          bucket.items.map((item) => (
            <li key={item} className="rounded-2xl border border-line bg-white/80 px-4 py-3">
              {item}
            </li>
          ))
        ) : (
          <li className="rounded-2xl border border-line bg-white/80 px-4 py-3">
            Nothing here right now.
          </li>
        )}
      </ul>
    </div>
  );
}

export function ProjectStepLane({
  step,
  evaluation,
  warningItems,
  laneEvaluation,
  projectTypeEvaluation,
  laneTagsEvaluation,
  lanePrimary,
  projectType,
  laneTags,
  currentOutputLabel,
  laneTemplate,
  onChangeLane,
  onChangeProjectType,
  onToggleLaneTag
}: ProjectStepLaneProps) {
  return (
    <ProjectStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProjectFieldBlock
        label="Lane and output"
        detail="Choose the lane that matches the real job of this publication."
        coach={<FieldCoach evaluation={laneEvaluation} />}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <select
            id="project-field-lanePrimary"
            value={lanePrimary}
            onChange={(event) => onChangeLane(event.target.value as LaneTag)}
            className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            {laneOrder.map((lane) => (
              <option key={lane} value={lane}>
                {laneTagLabels[lane]}
              </option>
            ))}
          </select>
          <select
            id="project-field-projectType"
            value={projectType}
            onChange={(event) => onChangeProjectType(event.target.value as ProjectType)}
            className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            {Object.entries(projectTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink/72">
          Final output: <span className="font-medium text-ink">{currentOutputLabel}</span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {laneOrder.map((lane) => (
            <label
              key={lane}
              className="flex items-start gap-3 rounded-2xl border border-line bg-white/75 px-4 py-4 text-sm text-ink/72"
            >
              <input
                type="checkbox"
                checked={laneTags.includes(lane)}
                onChange={() => onToggleLaneTag(lane)}
                className="mt-1 rounded"
              />
              <span>
                <span className="block font-medium text-ink">{laneTagLabels[lane]}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <FieldCoach evaluation={projectTypeEvaluation} />
        </div>
        <div className="mt-4">
          <FieldCoach evaluation={laneTagsEvaluation} />
        </div>
      </ProjectFieldBlock>

      {laneTemplate.examples[0] ? (
        <div className="mt-6 rounded-2xl border border-line bg-white/65 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">See an example</p>
          <p className="mt-2 font-medium text-ink">{laneTemplate.examples[0].title}</p>
          <p className="mt-2 text-sm leading-6 text-ink/68">{laneTemplate.examples[0].body}</p>
        </div>
      ) : null}
    </ProjectStepLayout>
  );
}

export function ProjectStepContext({
  step,
  evaluation,
  warningItems,
  issueEvaluation,
  teamEvaluation,
  proposalEvaluation,
  collaboratorEvaluation,
  issues,
  teams,
  proposals,
  users,
  viewerId,
  issueId,
  teamId,
  supportingProposalId,
  collaboratorIds,
  onChangeIssue,
  onChangeTeam,
  onChangeSupportingProposal,
  onToggleCollaborator
}: ProjectStepContextProps) {
  const selectedIssue = issues.find((issue) => issue.id === issueId) ?? null;

  return (
    <ProjectStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProjectFieldBlock
        label="Primary issue"
        detail="Choose the one live issue this project is mainly trying to help."
        coach={<FieldCoach evaluation={issueEvaluation} />}
      >
        <select
          id="project-field-issueId"
          value={issueId}
          onChange={(event) => onChangeIssue(event.target.value)}
          className="w-full rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">No linked issue</option>
          {issues.map((issue) => (
            <option key={issue.id} value={issue.id}>
              {issue.title} · severity {issue.severity}
            </option>
          ))}
        </select>

        <div className="mt-4 rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm leading-6 text-ink/70">
          {selectedIssue ? (
            <>
              <span className="block font-medium text-ink">
                {selectedIssue.title} · severity {selectedIssue.severity}
              </span>
              <span className="mt-2 block">
                {selectedIssue.description.trim() || "This is the issue the project will stay anchored to while you write."}
              </span>
            </>
          ) : (
            "Choose one issue so the rest of the wizard keeps pointing at the same problem."
          )}
        </div>
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Team and proposal context"
        detail="Add a team or proposal only if it truly grounds the work."
        coach={
          <div className="space-y-4">
            <FieldCoach evaluation={teamEvaluation} />
            <FieldCoach evaluation={proposalEvaluation} />
          </div>
        }
      >
        <div className="grid gap-4">
          <select
            id="project-field-teamId"
            value={teamId}
            onChange={(event) => onChangeTeam(event.target.value)}
            className="w-full rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">No linked team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select
            id="project-field-supportingProposalId"
            value={supportingProposalId}
            onChange={(event) => onChangeSupportingProposal(event.target.value)}
            className="w-full rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">No supporting proposal</option>
            {proposals.map((proposal) => (
              <option key={proposal.id} value={proposal.id}>
                {proposal.title} · {proposal.issue.title}
              </option>
            ))}
          </select>
        </div>
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Collaborators"
        detail="Add only the students who really shaped this work."
        coach={<FieldCoach evaluation={collaboratorEvaluation} />}
      >
        <div className="grid gap-2 md:grid-cols-2">
          {users
            .filter((user) => user.id !== viewerId)
            .map((user) => (
              <label key={user.id} className="flex items-center gap-2 text-sm text-ink/72">
                <input
                  type="checkbox"
                  checked={collaboratorIds.includes(user.id)}
                  onChange={() => onToggleCollaborator(user.id)}
                  className="rounded"
                />
                {user.name}
              </label>
            ))}
        </div>
      </ProjectFieldBlock>
    </ProjectStepLayout>
  );
}

export function ProjectStepOpening({
  step,
  evaluation,
  warningItems,
  titleEvaluation,
  summaryEvaluation,
  abstractEvaluation,
  title,
  summary,
  abstract,
  onChangeTitle,
  onChangeSummary,
  onChangeAbstract,
  onUseTitleStarter,
  onUseSummaryStarter,
  onUseAbstractStarter
}: ProjectStepOpeningProps) {
  return (
    <ProjectStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProjectFieldBlock
        label="Title"
        detail="Give the publication a title that a new reader can understand right away."
        coach={<FieldCoach evaluation={titleEvaluation} onUseStarter={onUseTitleStarter} />}
      >
        <StepInput
          id="project-field-title"
          value={title}
          onChange={onChangeTitle}
          placeholder="How the second apron changes small-market flexibility"
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Short summary"
        detail="Explain the whole publication in one or two calm sentences."
        coach={<FieldCoach evaluation={summaryEvaluation} onUseStarter={onUseSummaryStarter} />}
      >
        <StepTextarea
          id="project-field-summary"
          value={summary}
          rows={4}
          onChange={onChangeSummary}
          placeholder="This project studies ..."
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Abstract"
        detail="Give the question, the method, and the main finding or output."
        coach={<FieldCoach evaluation={abstractEvaluation} onUseStarter={onUseAbstractStarter} />}
      >
        <StepTextarea
          id="project-field-abstract"
          value={abstract}
          rows={6}
          onChange={onChangeAbstract}
          placeholder="This project asks ..."
        />
      </ProjectFieldBlock>
    </ProjectStepLayout>
  );
}

export function ProjectStepMission({
  step,
  evaluation,
  warningItems,
  questionEvaluation,
  methodsEvaluation,
  essentialQuestion,
  methodsSummary,
  onChangeQuestion,
  onChangeMethods,
  onUseQuestionStarter,
  onUseMethodsStarter
}: ProjectStepMissionProps) {
  return (
    <ProjectStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProjectFieldBlock
        label="Question or mission"
        detail="State the question, design mission, or strategy goal clearly."
        coach={<FieldCoach evaluation={questionEvaluation} onUseStarter={onUseQuestionStarter} />}
      >
        <StepInput
          id="project-field-essentialQuestion"
          value={essentialQuestion}
          onChange={onChangeQuestion}
          placeholder="How does the second apron change planning freedom for small-market teams?"
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Methods summary"
        detail="Explain how the work was investigated or built."
        coach={<FieldCoach evaluation={methodsEvaluation} onUseStarter={onUseMethodsStarter} />}
      >
        <StepTextarea
          id="project-field-methodsSummary"
          value={methodsSummary}
          rows={5}
          onChange={onChangeMethods}
          placeholder="I studied this by ..."
        />
      </ProjectFieldBlock>
    </ProjectStepLayout>
  );
}

export function ProjectStepBody({
  step,
  evaluation,
  warningItems,
  overviewEvaluation,
  contextEvaluation,
  evidenceEvaluation,
  analysisEvaluation,
  recommendationEvaluation,
  overviewLabel,
  overview,
  context,
  evidence,
  analysis,
  recommendations,
  onChangeOverview,
  onChangeContext,
  onChangeEvidence,
  onChangeAnalysis,
  onChangeRecommendations,
  onUseOverviewStarter,
  onUseContextStarter,
  onUseEvidenceStarter,
  onUseAnalysisStarter,
  onUseRecommendationStarter
}: ProjectStepBodyProps) {
  return (
    <ProjectStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProjectFieldBlock
        label={overviewLabel}
        detail="Open with the main point so the reader knows where this piece is going."
        coach={<FieldCoach evaluation={overviewEvaluation} onUseStarter={onUseOverviewStarter} />}
      >
        <StepTextarea
          id="project-field-overview"
          value={overview}
          rows={5}
          onChange={onChangeOverview}
          placeholder="The main thing readers should understand is ..."
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Context"
        detail="Optional background that helps the evidence make sense."
        coach={<FieldCoach evaluation={contextEvaluation} onUseStarter={onUseContextStarter} />}
      >
        <StepTextarea
          id="project-field-context"
          value={context}
          rows={5}
          onChange={onChangeContext}
          placeholder="Before the findings make sense, readers need to know ..."
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Evidence"
        detail="Name the records, inputs, examples, or observations behind the work."
        coach={<FieldCoach evaluation={evidenceEvaluation} onUseStarter={onUseEvidenceStarter} />}
      >
        <StepTextarea
          id="project-field-evidence"
          value={evidence}
          rows={6}
          onChange={onChangeEvidence}
          placeholder="The main evidence comes from ..."
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Analysis"
        detail="Explain what the evidence means, not just what it says."
        coach={<FieldCoach evaluation={analysisEvaluation} onUseStarter={onUseAnalysisStarter} />}
      >
        <StepTextarea
          id="project-field-analysis"
          value={analysis}
          rows={6}
          onChange={onChangeAnalysis}
          placeholder="The important pattern is ..."
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Recommendation"
        detail="End with the action, conclusion, or next move the reader should take."
        coach={<FieldCoach evaluation={recommendationEvaluation} onUseStarter={onUseRecommendationStarter} />}
      >
        <StepTextarea
          id="project-field-recommendations"
          value={recommendations}
          rows={5}
          onChange={onChangeRecommendations}
          placeholder="The next step should be ..."
        />
      </ProjectFieldBlock>
    </ProjectStepLayout>
  );
}

export function ProjectStepLaneSections({
  step,
  evaluation,
  warningItems,
  laneSectionsEvaluation,
  sectionEvaluations,
  laneSections,
  outputLabel,
  onChangeSection,
  onUseSectionStarter
}: ProjectStepLaneSectionsProps) {
  return (
    <ProjectStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProjectFieldBlock
        label={`${outputLabel} sections`}
        detail="Each section below has a job. Complete them so the publication truly matches the lane."
        coach={<FieldCoach evaluation={laneSectionsEvaluation} />}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {laneSections.map((section) => {
            const sectionEvaluation = sectionEvaluations.find((entry) => entry.key === section.key);

            if (!sectionEvaluation) {
              return null;
            }

            return (
              <div key={section.key} className="rounded-2xl border border-line bg-white/80 p-4">
                <p className="font-medium text-ink">{section.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/66">{section.prompt}</p>
                <div className="mt-4">
                  <StepTextarea
                    id={`project-field-laneSection-${section.key}`}
                    value={section.value}
                    rows={6}
                    onChange={(value) => onChangeSection(section.key, value)}
                    placeholder={section.prompt}
                  />
                </div>
                <FieldCoach
                  evaluation={{
                    state: sectionEvaluation.state,
                    message: sectionEvaluation.message,
                    nextMove: sectionEvaluation.nextMove,
                    recipe: sectionEvaluation.recipe,
                    starters: sectionEvaluation.starters,
                    missingIngredients: sectionEvaluation.missingIngredients,
                    weakExample: sectionEvaluation.weakExample,
                    strongExample: sectionEvaluation.strongExample
                  }}
                  onUseStarter={(starter) => onUseSectionStarter(section.key, starter)}
                />
              </div>
            );
          })}
        </div>
      </ProjectFieldBlock>
    </ProjectStepLayout>
  );
}

export function ProjectStepPublish({
  step,
  evaluation,
  warningItems,
  artifactEvaluation,
  referencesEvaluation,
  keywordsEvaluation,
  takeawaysEvaluation,
  slugEvaluation,
  reflectionEvaluation,
  artifactLinks,
  references,
  keywords,
  keyTakeaways,
  publicationSlug,
  reflection,
  onChangeArtifactLinks,
  onChangeReferences,
  onChangeKeywords,
  onChangeTakeaways,
  onChangeSlug,
  onChangeReflection,
  onUseArtifactStarter,
  onUseReferencesStarter,
  onUseKeywordsStarter,
  onUseTakeawayStarter,
  onUseSlugStarter,
  onUseReflectionStarter
}: ProjectStepPublishProps) {
  return (
    <ProjectStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProjectFieldBlock
        label="Artifact links"
        detail="Optional links to tools, notes, visuals, or outputs that help readers use the project."
        coach={<FieldCoach evaluation={artifactEvaluation} onUseStarter={onUseArtifactStarter} />}
      >
        <StepTextarea
          id="project-field-artifactLinks"
          value={artifactLinks}
          rows={5}
          onChange={onChangeArtifactLinks}
          placeholder="Label | https://..."
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="References"
        detail="Optional, but helpful: add a clear source trail behind the project."
        coach={<FieldCoach evaluation={referencesEvaluation} onUseStarter={onUseReferencesStarter} />}
      >
        <StepTextarea
          id="project-field-references"
          value={references}
          rows={5}
          onChange={onChangeReferences}
          placeholder="Label | https://... | DATASET | note"
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Keywords"
        detail="Add plain-language topic words people could actually search."
        coach={<FieldCoach evaluation={keywordsEvaluation} onUseStarter={onUseKeywordsStarter} />}
      >
        <StepInput
          id="project-field-keywords"
          value={keywords}
          onChange={onChangeKeywords}
          placeholder="second apron, small-market teams, league flexibility"
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Key takeaways"
        detail="One takeaway per line if you want the publication easier to skim."
        coach={<FieldCoach evaluation={takeawaysEvaluation} onUseStarter={onUseTakeawayStarter} />}
      >
        <StepTextarea
          id="project-field-keyTakeaways"
          value={keyTakeaways}
          rows={5}
          onChange={onChangeTakeaways}
          placeholder="One takeaway per line"
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Publication slug"
        detail="Optional custom URL name."
        coach={<FieldCoach evaluation={slugEvaluation} onUseStarter={onUseSlugStarter} />}
      >
        <StepInput
          id="project-field-publicationSlug"
          value={publicationSlug}
          onChange={onChangeSlug}
          placeholder="second-apron-flexibility-patterns"
        />
      </ProjectFieldBlock>

      <ProjectFieldBlock
        label="Reflection"
        detail="Optional, but strong work often names its real limits and next improvement."
        coach={<FieldCoach evaluation={reflectionEvaluation} onUseStarter={onUseReflectionStarter} />}
      >
        <StepTextarea
          id="project-field-reflection"
          value={reflection}
          rows={5}
          onChange={onChangeReflection}
          placeholder="The main uncertainty is ..."
        />
      </ProjectFieldBlock>
    </ProjectStepLayout>
  );
}

export function ProjectStepReview({
  step,
  evaluation,
  warningItems,
  findingsEvaluation,
  findingsMd,
  blockers,
  polish,
  strengths,
  laneTemplate,
  onChangeFindings
}: ProjectStepReviewProps) {
  return (
    <ProjectStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <div className="grid gap-4 lg:grid-cols-3">
        <ReviewBucket bucket={blockers} />
        <ReviewBucket bucket={polish} />
        <ReviewBucket bucket={strengths} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white/70 p-4">
          <p className="font-medium text-ink">Lane checklist</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
            {laneTemplate.checklist.map((item) => (
              <li key={item.key} className="rounded-2xl border border-line bg-white/80 px-4 py-3">
                <span className="font-medium text-ink">{item.label}</span>
                <span className="mt-1 block text-ink/62">{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-white/70 p-4">
          <p className="font-medium text-ink">External publication checks</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
            {laneTemplate.externalReadinessRules.map((rule) => (
              <li key={rule} className="rounded-2xl border border-line bg-white/80 px-4 py-3">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ProjectFieldBlock
        label="Legacy markdown summary"
        detail="Leave this blank unless you truly want to override the structured sections with a custom markdown body."
        coach={<FieldCoach evaluation={findingsEvaluation} />}
      >
        <StepTextarea
          id="project-field-findingsMd"
          value={findingsMd}
          rows={7}
          onChange={onChangeFindings}
          placeholder="Optional markdown override"
        />
      </ProjectFieldBlock>
    </ProjectStepLayout>
  );
}
