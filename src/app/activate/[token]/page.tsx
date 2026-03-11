import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { StudentActivationForm } from "@/components/student-activation-form";
import { gradeBandLabels } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { activateStudentInviteAction } from "@/server/actions";
import { getViewer } from "@/server/auth";

function activationMessage(status?: string) {
  if (status === "invalid") {
    return {
      tone: "warn" as const,
      text: "Enter matching passwords with at least 8 characters."
    };
  }

  if (status === "used") {
    return {
      tone: "warn" as const,
      text: "That activation link has already been used. Ask your teacher for a new one if needed."
    };
  }

  if (status === "expired") {
    return {
      tone: "warn" as const,
      text: "That activation link has expired. Ask your teacher to create a fresh one."
    };
  }

  return null;
}

function inviteHasExpired(expiresAt: Date) {
  return expiresAt.getTime() < Date.now();
}

export default async function ActivateStudentPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ status?: string }>;
}) {
  const viewer = await getViewer();

  if (viewer) {
    return (
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Student access"
          title="This account is already active"
          description="You are already signed in, so you do not need to activate the account again."
        />
        <div className="panel p-6">
          <Link
            href="/"
            className="inline-flex rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { token } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const invite = await prisma.studentInvite.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          linkedTeam: true
        }
      }
    }
  });

  const notice = activationMessage(resolvedSearchParams.status);

  if (!invite) {
    return (
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Student access"
          title="Activation link not found"
          description="This link is not valid anymore. Ask your teacher to create a fresh student activation link."
        />
        <div className="panel p-6">
          <Link
            href="/login"
            className="inline-flex rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = inviteHasExpired(invite.expiresAt);
  const isUsed = Boolean(invite.usedAt);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-6">
        <SectionHeading
          eyebrow="Student access"
          title={`Activate ${invite.user.name}`}
          description="Set a password once, then use your email and that password on the normal login page to start the universe tour."
        />

        <div className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Account details</h3>
            <Badge tone={isUsed ? "success" : isExpired ? "warn" : "default"}>
              {isUsed ? "Activated" : isExpired ? "Expired" : "Ready"}
            </Badge>
          </div>

          <div className="mt-5 space-y-4 text-sm text-ink/75">
            <p>
              <span className="font-medium text-ink">Email:</span> {invite.user.email}
            </p>
            <p>
              <span className="font-medium text-ink">Linked team:</span>{" "}
              {invite.user.linkedTeam?.name ?? "No team linked yet"}
            </p>
            <p>
              <span className="font-medium text-ink">Grade band:</span>{" "}
              {invite.user.gradeBand ? gradeBandLabels[invite.user.gradeBand] : "Choose during activation"}
            </p>
            <p>
              <span className="font-medium text-ink">Link expires:</span>{" "}
              {invite.expiresAt.toLocaleDateString("en-US")}
            </p>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <h3 className="font-display text-2xl text-ink">Set your password</h3>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          Use at least 8 characters. After activation, sign in on the normal login screen and the first-time tour will take over from there.
        </p>

        {notice ? (
          <div className="mt-5 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
            {notice.text}
          </div>
        ) : null}

        {isUsed ? (
          <div className="mt-6 rounded-2xl border border-success/30 bg-success/10 px-4 py-4 text-sm text-success">
            This activation link has already been used. You can sign in now with your email and password.
          </div>
        ) : isExpired ? (
          <div className="mt-6 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-4 text-sm text-warn">
            This link expired before it was used. Ask your teacher to create a new student invite.
          </div>
        ) : (
          <StudentActivationForm
            action={activateStudentInviteAction}
            token={invite.token}
            initialGradeBand={invite.user.gradeBand}
          />
        )}

        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
          >
            Back to login
          </Link>
        </div>
      </section>
    </div>
  );
}
