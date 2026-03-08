import { redirect } from "next/navigation";
import Link from "next/link";

import { Badge } from "@/components/badge";
import { LoginForm } from "@/components/login-form";
import { SectionHeading } from "@/components/section-heading";
import { getViewer } from "@/server/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ email?: string; activated?: string; signedUp?: string }>;
}) {
  const viewer = await getViewer();
  const resolvedSearchParams = (await searchParams) ?? {};

  if (viewer) {
    redirect("/");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-6">
        <SectionHeading
          eyebrow="Access"
          title="Sign in to the research terminal"
          description="Credentials auth is live. Use a seeded demo account, a commissioner-created student account, or a class-code signup account to enter the research terminal."
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

        {resolvedSearchParams.activated === "1" ? (
          <div className="mt-5 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            Account activated. Sign in with the email and password you just set.
          </div>
        ) : null}

        {resolvedSearchParams.signedUp === "1" ? (
          <div className="mt-5 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            Account created. Sign in with the email and password you just set.
          </div>
        ) : null}

        <div className="mt-6">
          <LoginForm defaultEmail={resolvedSearchParams.email} />
        </div>

        <div className="mt-5 text-sm text-ink/65">
          Need a new student account?{" "}
          <Link href="/signup" className="font-medium text-accent">
            Sign up with a class code
          </Link>
          .
        </div>
      </section>
    </div>
  );
}
