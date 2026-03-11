import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { gradeBandDescriptions, gradeBandLabels } from "@/lib/types";
import { getViewer } from "@/server/auth";
import { signUpWithClassCodeAction } from "@/server/community-actions";

function signupNotice(status?: string) {
  if (status === "code-missing") {
    return "That class code was not found or is not active anymore.";
  }

  if (status === "code-expired") {
    return "That class code expired. Ask your teacher for a fresh one.";
  }

  if (status === "email-taken") {
    return "That email already belongs to another BOW Universe account.";
  }

  if (status === "invalid") {
    return "Fill in every required field and make sure the passwords match.";
  }

  return null;
}

export default async function SignupPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string; code?: string }>;
}) {
  const viewer = await getViewer();
  const resolvedSearchParams = (await searchParams) ?? {};

  if (viewer) {
    redirect("/");
  }

  const notice = signupNotice(resolvedSearchParams.status);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-6">
        <SectionHeading
          eyebrow="Student signup"
          title="Create your own student account"
          description="Use a class code from your teacher, choose the section that fits your class, and then sign in to start the full universe tour."
        />

        <div className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">What you need</h3>
            <Badge tone="success">Immediate access</Badge>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-6 text-ink/70">
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              1. A valid class code from your teacher.
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              2. Your name, email, and a password with at least 8 characters.
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              3. The grade-band section your class is using, if your teacher already told you.
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <h3 className="font-display text-2xl text-ink">Class-code registration</h3>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          If you already have an account, head back to the sign-in page instead of creating a second one.
        </p>

        {notice ? (
          <div className="mt-5 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
            {notice}
          </div>
        ) : null}

        <form action={signUpWithClassCodeAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="signup-class-code" className="block font-mono text-xs uppercase tracking-[0.22em] text-accent">
              Class code
            </label>
            <input
              id="signup-class-code"
              name="classCode"
              type="text"
              defaultValue={resolvedSearchParams.code ?? ""}
              placeholder="BOW-AB12"
              className="mt-2 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="signup-name" className="block font-mono text-xs uppercase tracking-[0.22em] text-accent">
              Name
            </label>
            <input
              id="signup-name"
              name="name"
              type="text"
              placeholder="Jordan Rivera"
              className="mt-2 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="block font-mono text-xs uppercase tracking-[0.22em] text-accent">
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              placeholder="jordan.rivera@bow.local"
              className="mt-2 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="signup-grade-band" className="block font-mono text-xs uppercase tracking-[0.22em] text-accent">
              Grade band
            </label>
            <select
              id="signup-grade-band"
              name="gradeBand"
              defaultValue=""
              className="mt-2 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">Use the class-code default or choose later</option>
              {Object.entries(gradeBandLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-5 text-ink/60">
              {gradeBandLabels.GRADE_5_6}: {gradeBandDescriptions.GRADE_5_6} {gradeBandLabels.GRADE_7_8}:{" "}
              {gradeBandDescriptions.GRADE_7_8}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="signup-password" className="block font-mono text-xs uppercase tracking-[0.22em] text-accent">
                Password
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                className="mt-2 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <label htmlFor="signup-confirm-password" className="block font-mono text-xs uppercase tracking-[0.22em] text-accent">
                Confirm password
              </label>
              <input
                id="signup-confirm-password"
                name="confirmPassword"
                type="password"
                className="mt-2 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Create my student account
          </button>
        </form>

        <div className="mt-5 text-sm text-ink/65">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent">
            Sign in here
          </Link>
          .
        </div>
      </section>
    </div>
  );
}
