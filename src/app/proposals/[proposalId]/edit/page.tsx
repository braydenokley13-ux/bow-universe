import { notFound } from "next/navigation";

import { ProposalForm } from "@/components/proposal-form";
import { SectionHeading } from "@/components/section-heading";
import { updateProposalAction } from "@/server/actions";
import { getViewer, requireUser } from "@/server/auth";
import {
  getProposalPageData,
  getProposalStudioData,
  parseProposalJson
} from "@/server/data";

export default async function EditProposalPage({ params }: { params: { proposalId: string } }) {
  const [viewer, studioData, proposalRecord] = await Promise.all([
    getViewer(),
    getProposalStudioData(params.proposalId),
    getProposalPageData(params.proposalId)
  ]);

  if (!studioData.proposal || !proposalRecord) {
    notFound();
  }

  await requireUser();

  if (viewer?.id !== studioData.proposal.createdByUserId && viewer?.role !== "ADMIN") {
    notFound();
  }

  const parsed = parseProposalJson(proposalRecord);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Proposal Studio"
        title={`Revise ${studioData.proposal.title}`}
        description="This route reopens the proposal memo so students can respond to feedback, strengthen the writing, and keep the policy record publication-ready."
      />

      <ProposalForm
        action={updateProposalAction}
        issues={studioData.issues}
        ruleSets={studioData.ruleSets}
        intentLabel="Resubmit for review"
        initial={{
          id: studioData.proposal.id,
          title: studioData.proposal.title,
          issueId: studioData.proposal.issueId,
          ruleSetId: studioData.proposal.ruleSetIdTarget,
          abstract: studioData.proposal.abstract ?? parsed.narrative.problem,
          methodsSummary: studioData.proposal.methodsSummary ?? "",
          problem: parsed.content.problem,
          currentRuleContext: parsed.content.currentRuleContext,
          proposedChange: parsed.content.proposedChange,
          impactAnalysis: parsed.content.impactAnalysis,
          tradeoffs: parsed.content.tradeoffs,
          sandboxInterpretation: parsed.content.sandboxInterpretation,
          recommendation: parsed.content.recommendation,
          diffJson: JSON.stringify(parsed.diff, null, 2),
          referencesText: parsed.references
            .map((reference) =>
              [reference.label, reference.url, reference.sourceType, reference.note ?? ""]
                .filter(Boolean)
                .join(" | ")
            )
            .join("\n"),
          keywordsText: parsed.keywords.join(", "),
          keyTakeawaysText: parsed.keyTakeaways.join("\n"),
          publicationSlug: studioData.proposal.publicationSlug ?? "",
          sandboxResult: parsed.sandbox
        }}
      />
    </div>
  );
}
