import { PlaceholderPage } from "@/components/placeholder-page";

export default function ProposalDetailPage({ params }: { params: { proposalId: string } }) {
  return (
    <PlaceholderPage
      eyebrow="Proposal Detail"
      title={`Proposal review · ${params.proposalId}`}
      description="This route will show the proposal narrative, rule diff, sandbox impact report, votes, and commissioner decision controls."
      checkpoints={[
        "Students will see the policy case and expected tradeoffs in one place.",
        "Votes will be one per user inside the configured voting window.",
        "Admin-only decision actions will govern the next pending ruleset."
      ]}
    />
  );
}
