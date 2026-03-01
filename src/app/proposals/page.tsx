import { PlaceholderPage } from "@/components/placeholder-page";

export default function ProposalsPage() {
  return (
    <PlaceholderPage
      eyebrow="Proposals"
      title="Policy reform pipeline"
      description="This page will list draft, submitted, voting, and decision-stage proposals with a clear policy workflow."
      checkpoints={[
        "Each proposal will target a specific issue and active ruleset.",
        "Voting and commissioner decisions will be visible from proposal detail pages.",
        "Sandbox simulation results will compare baseline and proposed rules."
      ]}
    />
  );
}
