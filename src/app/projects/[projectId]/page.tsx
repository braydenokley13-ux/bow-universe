import { PlaceholderPage } from "@/components/placeholder-page";

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  return (
    <PlaceholderPage
      eyebrow="Project Detail"
      title={`Project file · ${params.projectId}`}
      description="This route will show the full project record, collaborators, findings, artifact links, and simple discussion comments."
      checkpoints={[
        "Markdown findings will render as readable research notes.",
        "Comments will stay intentionally simple for first release stability.",
        "Linked teams, issues, and proposals will make project context visible."
      ]}
    />
  );
}
