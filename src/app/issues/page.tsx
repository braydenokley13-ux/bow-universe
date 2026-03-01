import { PlaceholderPage } from "@/components/placeholder-page";

export default function IssuesPage() {
  return (
    <PlaceholderPage
      eyebrow="Issues Board"
      title="Systemic league problems"
      description="This board will track league-wide problems such as inequality, tax concentration, and competitiveness drift."
      checkpoints={[
        "Severity and status filters will shape the board.",
        "Issues will connect directly to projects and proposals.",
        "Some issues will be generated automatically by threshold logic later."
      ]}
    />
  );
}
