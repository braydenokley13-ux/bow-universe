import { PlaceholderPage } from "@/components/placeholder-page";

export default function TeamDetailPage({ params }: { params: { teamId: string } }) {
  return (
    <PlaceholderPage
      eyebrow="Team Detail"
      title={`Team dossier · ${params.teamId}`}
      description="This route will become a team-specific research page with contracts, finance snapshots, strategy archive entries, and linked issues."
      checkpoints={[
        "Cap table and contract history will come from seeded contract data.",
        "Revenue, tax, valuation, and performance proxy will come from season snapshots.",
        "Strategy archive entries will be filtered from project records."
      ]}
    />
  );
}
