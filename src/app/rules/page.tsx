import { PlaceholderPage } from "@/components/placeholder-page";

export default function RulesPage() {
  return (
    <PlaceholderPage
      eyebrow="Rules"
      title="Versioned rulebook"
      description="This page will render the active RuleSet into plain language and show past and pending versions with diffs."
      checkpoints={[
        "Rules are stored as structured data, not hard-coded page copy.",
        "Version history will make policy changes easy to audit.",
        "Pending next-season rules will be visible before they take effect."
      ]}
    />
  );
}
