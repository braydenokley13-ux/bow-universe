import { PlaceholderPage } from "@/components/placeholder-page";

export default function IssueDetailPage({ params }: { params: { issueId: string } }) {
  return (
    <PlaceholderPage
      eyebrow="Issue Detail"
      title={`Issue record · ${params.issueId}`}
      description="This route will show the problem statement, evidence, key metrics, related projects, and linked reform proposals."
      checkpoints={[
        "Evidence will support the issue in plain classroom-friendly language.",
        "Metrics panels will surface the specific system signals tied to the issue.",
        "Projects and proposals will be linked for clear research-to-policy flow."
      ]}
    />
  );
}
