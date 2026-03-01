import { PlaceholderPage } from "@/components/placeholder-page";

export default function NewProposalPage() {
  return (
    <PlaceholderPage
      eyebrow="New Proposal"
      title="Guided reform form"
      description="This route will guide students through issue selection, narrative drafting, structured rule diff entry, and sandbox testing."
      checkpoints={[
        "Rule diffs will be validated against an explicit schema.",
        "The narrative will capture problem, change, impact, and tradeoffs.",
        "Draft saving and later submission will follow the same form flow."
      ]}
    />
  );
}
