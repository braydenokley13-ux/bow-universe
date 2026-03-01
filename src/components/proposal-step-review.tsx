import { FieldCoach } from "@/components/field-coach";
import {
  ProposalFieldBlock,
  ProposalStepLayout,
  StepInput,
  StepTextarea
} from "@/components/proposal-step-shared";
import type {
  ProposalCoachFieldEvaluation,
  ProposalCoachReviewBucket,
  ProposalCoachStepDefinition,
  ProposalCoachStepEvaluation
} from "@/lib/proposal-wizard";

type ProposalStepReviewProps = {
  step: ProposalCoachStepDefinition;
  evaluation: ProposalCoachStepEvaluation;
  referencesEvaluation: ProposalCoachFieldEvaluation;
  keywordsEvaluation: ProposalCoachFieldEvaluation;
  takeawaysEvaluation: ProposalCoachFieldEvaluation;
  slugEvaluation: ProposalCoachFieldEvaluation;
  references: string;
  keywords: string;
  keyTakeaways: string;
  publicationSlug: string;
  blockers: ProposalCoachReviewBucket;
  polish: ProposalCoachReviewBucket;
  strengths: ProposalCoachReviewBucket;
  onChangeReferences: (value: string) => void;
  onChangeKeywords: (value: string) => void;
  onChangeTakeaways: (value: string) => void;
  onChangeSlug: (value: string) => void;
  onUseReferencesStarter: (starter: string) => void;
  onUseKeywordsStarter: (starter: string) => void;
  onUseTakeawaysStarter: (starter: string) => void;
  onUseSlugStarter: (starter: string) => void;
  warningItems?: string[];
};

function ReviewBucket({ bucket }: { bucket: ProposalCoachReviewBucket }) {
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

export function ProposalStepReview({
  step,
  evaluation,
  referencesEvaluation,
  keywordsEvaluation,
  takeawaysEvaluation,
  slugEvaluation,
  references,
  keywords,
  keyTakeaways,
  publicationSlug,
  blockers,
  polish,
  strengths,
  onChangeReferences,
  onChangeKeywords,
  onChangeTakeaways,
  onChangeSlug,
  onUseReferencesStarter,
  onUseKeywordsStarter,
  onUseTakeawaysStarter,
  onUseSlugStarter,
  warningItems
}: ProposalStepReviewProps) {
  return (
    <ProposalStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <div className="grid gap-4 lg:grid-cols-3">
        <ReviewBucket bucket={blockers} />
        <ReviewBucket bucket={polish} />
        <ReviewBucket bucket={strengths} />
      </div>

      <ProposalFieldBlock
        label="References"
        detail="Add at least one usable source line if it helps the memo feel grounded."
        coach={<FieldCoach evaluation={referencesEvaluation} onUseStarter={onUseReferencesStarter} />}
      >
        <StepTextarea
          id="proposal-field-references"
          name="references"
          value={references}
          rows={5}
          onChange={onChangeReferences}
          placeholder="Label | https://... | ARTICLE | note"
        />
      </ProposalFieldBlock>

      <ProposalFieldBlock
        label="Keywords"
        detail="Add plain-language topic phrases someone could actually search."
        coach={<FieldCoach evaluation={keywordsEvaluation} onUseStarter={onUseKeywordsStarter} />}
      >
        <StepInput
          id="proposal-field-keywords"
          name="keywords"
          value={keywords}
          onChange={onChangeKeywords}
          placeholder="revenue sharing, small-market teams, league parity"
        />
      </ProposalFieldBlock>

      <ProposalFieldBlock
        label="Key takeaways"
        detail="Add quick takeaway lines if you want the memo easier to skim."
        coach={<FieldCoach evaluation={takeawaysEvaluation} onUseStarter={onUseTakeawaysStarter} />}
      >
        <StepTextarea
          id="proposal-field-keyTakeaways"
          name="keyTakeaways"
          value={keyTakeaways}
          rows={5}
          onChange={onChangeTakeaways}
          placeholder="One takeaway per line"
        />
      </ProposalFieldBlock>

      <ProposalFieldBlock
        label="Publication slug"
        detail="Optional. Use lowercase words and dashes if you want a custom URL."
        coach={<FieldCoach evaluation={slugEvaluation} onUseStarter={onUseSlugStarter} />}
      >
        <StepInput
          id="proposal-field-publicationSlug"
          name="publicationSlug"
          value={publicationSlug}
          onChange={onChangeSlug}
          placeholder="raise-revenue-sharing-rate"
        />
      </ProposalFieldBlock>
    </ProposalStepLayout>
  );
}
