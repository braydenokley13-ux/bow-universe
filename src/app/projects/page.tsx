import { PlaceholderPage } from "@/components/placeholder-page";

export default function ProjectsPage() {
  return (
    <PlaceholderPage
      eyebrow="Projects"
      title="Student work across four lanes"
      description="Projects will be the shared workspace format across tools, investigations, strategy plans, and proposal support work."
      checkpoints={[
        "Students will be able to create multiple projects across lanes.",
        "Tool Registry and Strategy Archive will be filtered views of project records.",
        "Co-authors will be supported without real-time editing complexity."
      ]}
    />
  );
}
