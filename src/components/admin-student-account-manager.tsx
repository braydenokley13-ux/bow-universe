import { Badge } from "@/components/badge";
import { gradeBandLabels } from "@/lib/types";
import type { createStudentAccountAction } from "@/server/actions";

type AdminStudentAccountManagerProps = {
  action: typeof createStudentAccountAction;
  activationBaseUrl: string;
  notice?: string | null;
  studentEmail?: string | null;
  teams: Array<{
    id: string;
    name: string;
  }>;
  students: Array<{
    id: string;
    name: string;
    email: string;
    gradeBand: keyof typeof gradeBandLabels | null;
    linkedTeam: { name: string } | null;
    commissioner: { name: string } | null;
    studentInvites: Array<{
      token: string;
      createdAt: Date;
      expiresAt: Date;
      usedAt: Date | null;
    }>;
  }>;
};

function buildNoticeMessage(status?: string | null, studentEmail?: string | null) {
  if (status === "created") {
    return {
      tone: "success" as const,
      text: `Student account created${studentEmail ? ` for ${studentEmail}` : ""}. Copy the activation link below and send it to the student.`
    };
  }

  if (status === "email-taken") {
    return {
      tone: "warn" as const,
      text: "That email is already being used by another account."
    };
  }

  if (status === "team-missing") {
    return {
      tone: "warn" as const,
      text: "The selected team link could not be found. Try again."
    };
  }

  if (status === "invalid") {
    return {
      tone: "warn" as const,
      text: "Enter a valid student name and email before creating the account."
    };
  }

  return null;
}

function getInviteState(invites: AdminStudentAccountManagerProps["students"][number]["studentInvites"]) {
  const now = Date.now();
  const activeInvite = invites.find((invite) => !invite.usedAt && invite.expiresAt.getTime() > now);

  if (activeInvite) {
    return {
      invite: activeInvite,
      label: "Pending activation",
      tone: "warn" as const
    };
  }

  const latestInvite = invites[0] ?? null;
  if (!latestInvite) {
    return {
      invite: null,
      label: "No activation link",
      tone: "default" as const
    };
  }

  if (latestInvite.usedAt) {
    return {
      invite: latestInvite,
      label: "Activated",
      tone: "success" as const
    };
  }

  return {
    invite: latestInvite,
    label: "Invite expired",
    tone: "warn" as const
  };
}

export function AdminStudentAccountManager({
  action,
  activationBaseUrl,
  notice,
  studentEmail,
  teams,
  students
}: AdminStudentAccountManagerProps) {
  const resolvedNotice = buildNoticeMessage(notice, studentEmail);

  return (
    <section id="student-accounts" className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Student accounts</p>
          <h3 className="mt-3 font-display text-2xl text-ink">Create and link student access</h3>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Create a student account, optionally link it to a league team, and hand the student an activation link so they can set their own password.
          </p>
        </div>
        <Badge>{students.length} students</Badge>
      </div>

      {resolvedNotice ? (
        <div
          className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
            resolvedNotice.tone === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-warn/30 bg-warn/10 text-warn"
          }`}
        >
          {resolvedNotice.text}
        </div>
      ) : null}

      <form action={action} className="mt-6 grid gap-4 rounded-2xl border border-line bg-white/55 p-4 md:grid-cols-[1.2fr_1.1fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="student-name" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Student name
          </label>
          <input
            id="student-name"
            name="name"
            type="text"
            placeholder="Jordan Rivera"
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="student-email" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Student email
          </label>
          <input
            id="student-email"
            name="email"
            type="email"
            placeholder="jordan.rivera@bow.local"
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="student-team" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Linked team
          </label>
          <select
            id="student-team"
            name="linkedTeamId"
            defaultValue=""
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">No team link yet</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="student-grade-band" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Grade band
          </label>
          <select
            id="student-grade-band"
            name="gradeBand"
            defaultValue=""
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">Choose later during onboarding</option>
            {Object.entries(gradeBandLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-full border border-accent bg-accent px-4 py-3 text-sm font-medium text-white"
          >
            Create student
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {students.map((student) => {
          const inviteState = getInviteState(student.studentInvites);
          const activationUrl = inviteState.invite
            ? `${activationBaseUrl.replace(/\/$/, "")}/activate/${inviteState.invite.token}`
            : "";

          return (
            <div key={student.id} className="rounded-2xl border border-line bg-white/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-ink">{student.name}</p>
                  <p className="mt-1 text-sm text-ink/62">{student.email}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink/50">
                    {student.gradeBand ? `Track: ${gradeBandLabels[student.gradeBand]}` : "Track not chosen yet"}
                    {" · "}
                    {student.linkedTeam ? `Linked team: ${student.linkedTeam.name}` : "No linked team yet"}
                    {student.commissioner ? ` · Created by ${student.commissioner.name}` : ""}
                  </p>
                </div>
                <Badge tone={inviteState.tone}>{inviteState.label}</Badge>
              </div>

              {inviteState.invite ? (
                <div className="mt-4 space-y-2">
                  <label className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
                    Activation link
                  </label>
                  <input
                    readOnly
                    value={activationUrl}
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3 font-mono text-xs text-ink outline-none"
                  />
                  <p className="text-xs text-ink/55">
                    Created {new Date(inviteState.invite.createdAt).toLocaleDateString("en-US")} · Expires{" "}
                    {new Date(inviteState.invite.expiresAt).toLocaleDateString("en-US")}
                    {inviteState.invite.usedAt
                      ? ` · Used ${new Date(inviteState.invite.usedAt).toLocaleDateString("en-US")}`
                      : ""}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
