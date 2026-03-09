import { Badge } from "@/components/badge";
import { gradeBandLabels } from "@/lib/types";
import type { createClassCodeAction } from "@/server/community-actions";

type AdminClassCodeManagerProps = {
  action: typeof createClassCodeAction;
  teams: Array<{
    id: string;
    name: string;
  }>;
  cohorts: Array<{
    id: string;
    name: string;
  }>;
  classCodes: Array<{
    id: string;
    code: string;
    label: string;
    description: string | null;
    active: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    defaultGradeBand: keyof typeof gradeBandLabels | null;
    linkedTeam: { id: string; name: string } | null;
    cohort: { id: string; name: string } | null;
    commissioner: { name: string };
    signups: Array<{ id: string }>;
  }>;
};

export function AdminClassCodeManager({
  action,
  teams,
  cohorts,
  classCodes
}: AdminClassCodeManagerProps) {
  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Class codes</p>
          <h3 className="mt-3 font-display text-2xl text-ink">Open self-signup safely</h3>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Create a class code when you want students to register themselves immediately and attach to your commissioner workspace.
          </p>
        </div>
        <Badge>{classCodes.length} codes</Badge>
      </div>

      <form action={action} className="mt-6 grid gap-4 rounded-2xl border border-line bg-white/55 p-4 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="class-code-label" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Label
          </label>
          <input
            id="class-code-label"
            name="label"
            type="text"
            placeholder="Period 2 league research"
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="class-code-description" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Description
          </label>
          <input
            id="class-code-description"
            name="description"
            type="text"
            placeholder="Use this when we start the parity challenge."
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="class-code-team" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Default team
          </label>
          <select
            id="class-code-team"
            name="linkedTeamId"
            defaultValue=""
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">No default team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="class-code-grade-band" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Default grade band
          </label>
          <select
            id="class-code-grade-band"
            name="defaultGradeBand"
            defaultValue=""
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">Let students choose later</option>
            {Object.entries(gradeBandLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="class-code-cohort" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Cohort
          </label>
          <select
            id="class-code-cohort"
            name="cohortId"
            defaultValue=""
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">No cohort link yet</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] lg:grid-cols-1">
          <div>
            <label htmlFor="class-code-expiry" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Expires
            </label>
            <input
              id="class-code-expiry"
              name="expiresAt"
              type="datetime-local"
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="rounded-full border border-accent bg-accent px-4 py-3 text-sm font-medium text-white"
          >
            Create code
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {classCodes.map((classCode) => (
          <article key={classCode.id} className="rounded-2xl border border-line bg-white/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{classCode.label}</p>
                <p className="mt-1 font-mono text-sm text-accent">{classCode.code}</p>
                {classCode.description ? (
                  <p className="mt-2 text-sm leading-6 text-ink/68">{classCode.description}</p>
                ) : null}
              </div>
              <Badge tone={classCode.active ? "success" : "warn"}>
                {classCode.active ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-ink/55">
              <span>Signups {classCode.signups.length}</span>
              <span>Created by {classCode.commissioner.name}</span>
              {classCode.linkedTeam ? <span>Default team {classCode.linkedTeam.name}</span> : null}
              {classCode.defaultGradeBand ? <span>{gradeBandLabels[classCode.defaultGradeBand]}</span> : null}
              {classCode.cohort ? <span>Cohort {classCode.cohort.name}</span> : null}
            </div>

            <p className="mt-3 text-xs text-ink/55">
              Created {new Date(classCode.createdAt).toLocaleDateString("en-US")}
              {classCode.expiresAt
                ? ` · Expires ${new Date(classCode.expiresAt).toLocaleString("en-US")}`
                : " · No expiry set"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
