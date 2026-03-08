import Link from "next/link";

import { getViewer } from "@/server/auth";

import { MainNav } from "./main-nav";
import { MobileNav } from "./mobile-nav";
import { SignOutButton } from "./sign-out-button";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/start", label: "Start here" },
  { href: "/teams", label: "Teams" },
  { href: "/rules", label: "Rules" },
  { href: "/issues", label: "Issues" },
  { href: "/projects", label: "Projects" },
  { href: "/proposals", label: "Proposals" },
  { href: "/research", label: "Research" },
  { href: "/chronicle", label: "Chronicle" },
  { href: "/sandbox", label: "Sandbox" },
  { href: "/admin", label: "Admin" }
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  return (
    <div className="min-h-screen">
      <header className="print-hide border-b border-line/80 bg-panel/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:gap-6 lg:px-8 lg:py-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
                BOW Universe
              </p>
              <div>
                <h1 className="font-display text-2xl text-ink lg:text-4xl">BOW League Research Terminal</h1>
                <p className="hidden max-w-3xl text-sm leading-6 text-ink/70 lg:block">
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
                  {viewer.role === "STUDENT" && (
                    <Link
                      href="/"
                      className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent hover:text-white"
                    >
                      My Work
                    </Link>
                  )}
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
              <MobileNav items={navItems} />
            </div>
          </div>

          <div className="hidden lg:block">
            <MainNav items={navItems} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:px-8 print:max-w-none print:px-0 print:py-0">
        {children}
      </main>
    </div>
  );
}
