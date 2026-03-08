import { Badge } from "@/components/badge";
import { laneTagLabels } from "@/lib/types";
import type { createChallengeAction } from "@/server/community-actions";

type AdminChallengeDeskProps = {
  action: typeof createChallengeAction;
  issues: Array<{
    id: string;
    title: string;
  }>;
  teams: Array<{
    id: string;
    name: string;
  }>;
  challenges: Array<{
    id: string;
    title: string;
    summary: string;
    allowedEntryType: "PROJECT" | "PROPOSAL" | "EITHER";
    startsAt: Date;
    endsAt: Date;
    isOpen: boolean;
    laneTag: keyof typeof laneTagLabels | null;
    issue: { title: string } | null;
    team: { name: string } | null;
    entries: Array<unknown>;
  }>;
};

const laneOptions = Object.entries(laneTagLabels);

export function AdminChallengeDesk({
  action,
  issues,
  teams,
  challenges
}: AdminChallengeDeskProps) {
  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Challenges</p>
          <h3 className="mt-3 font-display text-2xl text-ink">Open competitive research work</h3>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Create time-boxed challenges so students compete on meaningful work quality and milestones instead of arcade scoring.
          </p>
        </div>
        <Badge>{challenges.length} total</Badge>
      </div>

      <form action={action} className="mt-6 grid gap-4 rounded-2xl border border-line bg-white/55 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="challenge-title" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Title
            </label>
            <input
              id="challenge-title"
              name="title"
              type="text"
              placeholder="Second apron pressure sprint"
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="challenge-summary" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Summary
            </label>
            <input
              id="challenge-summary"
              name="summary"
              type="text"
              placeholder="Students investigate which teams are least flexible under the current tax rules."
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label htmlFor="challenge-prompt" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Challenge prompt
          </label>
          <textarea
            id="challenge-prompt"
            name="prompt"
            rows={5}
            placeholder="Explain the exact research question, the kind of evidence that counts, and what a strong submission should prove."
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6 text-ink outline-none focus:border-accent"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label htmlFor="challenge-lane" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Lane
            </label>
            <select
              id="challenge-lane"
              name="laneTag"
              defaultValue=""
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">Any lane</option>
              {laneOptions.map(([lane, label]) => (
                <option key={lane} value={lane}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="challenge-issue" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Issue
            </label>
            <select
              id="challenge-issue"
              name="issueId"
              defaultValue=""
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">No issue filter</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  {issue.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="challenge-team" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Team
            </label>
            <select
              id="challenge-team"
              name="teamId"
              defaultValue=""
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">No team filter</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1fr_1fr_auto]">
          <div>
            <label htmlFor="challenge-entry-type" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Allowed work
            </label>
            <select
              id="challenge-entry-type"
              name="allowedEntryType"
              defaultValue="EITHER"
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="EITHER">Projects or proposals</option>
              <option value="PROJECT">Projects only</option>
              <option value="PROPOSAL">Proposals only</option>
            </select>
          </div>
          <div>
            <label htmlFor="challenge-start" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Starts
            </label>
            <input
              id="challenge-start"
              name="startsAt"
              type="datetime-local"
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="challenge-end" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Ends
            </label>
            <input
              id="challenge-end"
              name="endsAt"
              type="datetime-local"
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-full border border-accent bg-accent px-4 py-3 text-sm font-medium text-white"
            >
              Open challenge
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="challenge-notes" className="block font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Scoring notes
          </label>
          <textarea
            id="challenge-notes"
            name="scoringNotesMd"
            rows={3}
            placeholder="Optional notes about how spotlight bonuses should be used."
            className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6 text-ink outline-none focus:border-accent"
          />
        </div>
      </form>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {challenges.map((challenge) => (
          <article key={challenge.id} className="rounded-2xl border border-line bg-white/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{challenge.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/68">{challenge.summary}</p>
              </div>
              <Badge tone={challenge.isOpen ? "success" : "warn"}>
                {challenge.isOpen ? "Open" : "Closed"}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>{challenge.allowedEntryType}</Badge>
              {challenge.laneTag ? <Badge>{laneTagLabels[challenge.laneTag]}</Badge> : null}
              {challenge.issue ? <Badge>{challenge.issue.title}</Badge> : null}
              {challenge.team ? <Badge>{challenge.team.name}</Badge> : null}
            </div>

            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink/55">
              {challenge.entries.length} entries · {new Date(challenge.startsAt).toLocaleDateString("en-US")} to{" "}
              {new Date(challenge.endsAt).toLocaleDateString("en-US")}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
