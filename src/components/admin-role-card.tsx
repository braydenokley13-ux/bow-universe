import type { updateUserRoleAction } from "@/server/actions";

type AdminRoleCardProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    linkedTeamId?: string | null;
    linkedTeam?: { name: string } | null;
  };
  teams: Array<{
    id: string;
    name: string;
  }>;
  action: typeof updateUserRoleAction;
};

export function AdminRoleCard({ user, teams, action }: AdminRoleCardProps) {
  return (
    <form
      action={action}
      className="rounded-2xl border border-line bg-white/60 p-4"
    >
      <input type="hidden" name="userId" value={user.id} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{user.name}</p>
          <p className="mt-1 text-sm text-ink/62">{user.email}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink/50">
            Change roles carefully. Admins can move workflow states and publish archive records.
          </p>
          {user.role === "STUDENT" ? (
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink/45">
              {user.linkedTeam ? `Linked team: ${user.linkedTeam.name}` : "No team linked yet"}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {user.role === "STUDENT" ? (
            <select
              name="linkedTeamId"
              defaultValue={user.linkedTeamId ?? ""}
              className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">No linked team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          ) : (
            <input type="hidden" name="linkedTeamId" value="" />
          )}
          <select
            name="role"
            defaultValue={user.role}
            className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="STUDENT">STUDENT</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button
            type="submit"
            className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Apply
          </button>
        </div>
      </div>
    </form>
  );
}
