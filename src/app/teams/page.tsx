import { PlaceholderPage } from "@/components/placeholder-page";

export default function TeamsPage() {
  return (
    <PlaceholderPage
      eyebrow="Teams"
      title="League franchise index"
      description="This page will list all twelve fictional teams with market size, payroll, and tax status once seeded team and season data are wired in."
      checkpoints={[
        "The table structure will support all 12 teams.",
        "Market size tiers will become a first-class lens across the app.",
        "Each team row will link into a research-style franchise dossier."
      ]}
    />
  );
}
