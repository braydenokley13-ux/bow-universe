import type { saveIssueAction } from "@/server/actions";

type IssueRecord = {
  id: string;
  title: string;
  slug: string;
  description: string;
  severity: number;
  status: string;
  teamId: string | null;
  metricsJson: unknown;
  evidenceMd: string | null;
};

type TeamRecord = {
  id: string;
  name: string;
};

type AdminIssueWorkbenchProps = {
  issues: IssueRecord[];
  teams: TeamRecord[];
  action: typeof saveIssueAction;
};

function defaultMetrics(metrics: unknown) {
  return JSON.stringify(metrics ?? {}, null, 2);
}

export function AdminIssueWorkbench({ issues, teams, action }: AdminIssueWorkbenchProps) {
  return (
    <section className="panel p-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Issue workbench</p>
        <h3 className="mt-3 font-display text-2xl text-ink">Create and clean issue records</h3>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          Work from top to bottom: name the issue, set severity, record metrics, add evidence, then save.
        </p>
      </div>

      <form action={action} className="mt-6 rounded-[28px] border border-line bg-white/60 p-5">
        <p className="font-medium text-ink">New issue</p>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <input
              name="title"
              placeholder="Name the issue clearly"
              className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
            <input
              name="slug"
              placeholder="issue-slug"
              className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          <textarea
            name="description"
            rows={3}
            placeholder="Explain what is going wrong and why it matters."
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <div className="grid gap-4 md:grid-cols-3">
            <select
              name="severity"
              defaultValue="3"
              className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            >
              {[1, 2, 3, 4, 5].map((severity) => (
                <option key={severity} value={severity}>
                  Severity {severity}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue="OPEN"
              className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
            <select
              name="teamId"
              defaultValue=""
              className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">League-wide issue</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            name="metricsJson"
            rows={4}
            defaultValue="{}"
            className="rounded-2xl border border-line bg-white px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="evidenceMd"
            rows={4}
            placeholder="- Add the strongest evidence first"
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="w-fit rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Save issue
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {issues.map((issue) => (
          <form key={issue.id} action={action} className="rounded-[28px] border border-line bg-white/60 p-5">
            <input type="hidden" name="issueId" value={issue.id} />
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-ink">{issue.title}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/55">Save after each clean edit</p>
            </div>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <input
                  name="title"
                  defaultValue={issue.title}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                />
                <input
                  name="slug"
                  defaultValue={issue.slug}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                />
              </div>
              <textarea
                name="description"
                rows={3}
                defaultValue={issue.description}
                className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
              <div className="grid gap-4 md:grid-cols-3">
                <select
                  name="severity"
                  defaultValue={String(issue.severity)}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                >
                  {[1, 2, 3, 4, 5].map((severity) => (
                    <option key={severity} value={severity}>
                      Severity {severity}
                    </option>
                  ))}
                </select>
                <select
                  name="status"
                  defaultValue={issue.status}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_REVIEW">IN_REVIEW</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
                <select
                  name="teamId"
                  defaultValue={issue.teamId ?? ""}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="">League-wide issue</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                name="metricsJson"
                rows={4}
                defaultValue={defaultMetrics(issue.metricsJson)}
                className="rounded-2xl border border-line bg-white px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent"
              />
              <textarea
                name="evidenceMd"
                rows={4}
                defaultValue={issue.evidenceMd ?? ""}
                className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="w-fit rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                Save issue
              </button>
            </div>
          </form>
        ))}
      </div>
    </section>
  );
}
