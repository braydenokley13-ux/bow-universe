import Link from "next/link";

import { getViewer } from "@/server/auth";

import { SignOutButton } from "./sign-out-button";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/teams", label: "Teams" },
  { href: "/rules", label: "Rules" },
  { href: "/issues", label: "Issues" },
  { href: "/projects", label: "Projects" },
  { href: "/proposals", label: "Proposals" },
  { href: "/admin", label: "Admin" }
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line/80 bg-panel/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
                BOW Universe
              </p>
              <div>
                <h1 className="font-display text-4xl text-ink">BOW League Research Terminal</h1>
                <p className="max-w-3xl text-sm leading-6 text-ink/70">
                  A persistent fictional sports-economy league for grades 5 to 8. Calm,
                  analytical, and built for policy questions, team strategy, and student
                  research.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              {viewer ? (
                <>
                  <div className="rounded-full border border-line bg-mist px-4 py-2">
                    <span className="font-medium">{viewer.name}</span>
                    <span className="ml-2 font-mono text-xs uppercase tracking-wider text-ink/60">
                      {viewer.role}
                    </span>
                  </div>
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full border border-accent bg-accent px-4 py-2 font-medium text-white"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-line bg-white/50 px-4 py-2 text-sm text-ink/75 hover:border-accent hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
