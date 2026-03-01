import { PlaceholderPage } from "@/components/placeholder-page";

export default function LoginPage() {
  return (
    <PlaceholderPage
      eyebrow="Access"
      title="Sign-in entry point"
      description="Credentials-based sign-in will be connected in the auth stage. This page exists now so navigation and route coverage are complete from the start."
      checkpoints={[
        "Public reading will stay open to visitors.",
        "Writing, voting, comments, and admin controls will require sign-in.",
        "The commissioner account and student accounts will be seeded in a later diff."
      ]}
    />
  );
}
