import { PlaceholderPage } from "@/components/placeholder-page";

export default function AdminPage() {
  return (
    <PlaceholderPage
      eyebrow="Admin"
      title="Commissioner workspace"
      description="This page will become the teacher or commissioner control room for issue management, voting windows, season advancement, and user roles."
      checkpoints={[
        "Only admins will be able to take actions from this route.",
        "Governance tools will stay calm and operational, not game-like.",
        "Season advancement will stay locked until the simulation engine is live."
      ]}
    />
  );
}
