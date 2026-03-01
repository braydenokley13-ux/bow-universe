import { redirect } from "next/navigation";

import { Badge } from "@/components/badge";
import { LoginForm } from "@/components/login-form";
import { SectionHeading } from "@/components/section-heading";
import { getViewer } from "@/server/auth";

export default async function LoginPage() {
  const viewer = await getViewer();

  if (viewer) {
    redirect("/");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-6">
        <SectionHeading
          eyebrow="Access"
          title="Sign in to the research terminal"
          description="Credentials auth is now live. Use one of the seeded accounts below to create projects, vote on proposals, or access commissioner controls."
        />

        <div className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Seeded demo accounts</h3>
            <Badge tone="success">Working now</Badge>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-medium text-ink">Commissioner</p>
              <p className="mt-1 font-mono text-sm text-ink/75">commissioner@bow.local</p>
              <p className="font-mono text-sm text-ink/75">bowuniverse</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-medium text-ink">Student</p>
              <p className="mt-1 font-mono text-sm text-ink/75">riya-patel@bow.local</p>
              <p className="font-mono text-sm text-ink/75">bowuniverse</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <h3 className="font-display text-2xl text-ink">Credentials sign-in</h3>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          Signing in enables writing, comments, proposal voting, and commissioner actions.
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
