import Link from "next/link";
import { Activity } from "lucide-react";

import { getViewer } from "@/server/auth";

import { MainNav } from "./main-nav";
import { MobileNav } from "./mobile-nav";
import { SignOutButton } from "./sign-out-button";

const navItems = [
  { href: "/", label: "Home", icon: "Home" as const },
  { href: "/start", label: "Start", icon: "Compass" as const },
  { href: "/news", label: "News", icon: "Newspaper" as const },
  { href: "/challenges", label: "Challenges", icon: "Trophy" as const },
  { href: "/teams", label: "Teams", icon: "Users" as const },
  { href: "/rules", label: "Rules", icon: "BookOpen" as const },
  { href: "/issues", label: "Issues", icon: "AlertCircle" as const },
  { href: "/projects", label: "Projects", icon: "FolderKanban" as const },
  { href: "/proposals", label: "Proposals", icon: "FileText" as const },
  { href: "/research", label: "Research", icon: "FlaskConical" as const },
  { href: "/admin", label: "Admin", icon: "Settings" as const }
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  return (
    <div className="min-h-screen">
      {/* Slim sticky header */}
      <header className="print-hide sticky top-0 z-30 border-b border-line/50 bg-panel/88 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex h-14 items-center gap-3">
            {/* Brand */}
            <Link href="/" className="group flex flex-shrink-0 items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm transition group-hover:opacity-85">
                <Activity className="h-4 w-4" />
              </div>
              <span className="hidden font-display text-[15px] font-semibold tracking-tight text-ink sm:block">
                BOW Universe
              </span>
            </Link>

            {/* Vertical divider */}
            <div className="hidden h-5 w-px bg-line/80 lg:block" />

            {/* Nav — inline on desktop */}
            <div className="hidden flex-1 overflow-x-auto lg:block">
              <MainNav items={navItems} />
            </div>

            {/* Push user to right on mobile */}
            <div className="flex-1 lg:hidden" />

            {/* User + sign-out */}
            <div className="flex flex-shrink-0 items-center gap-2">
              {viewer ? (
                <>
                  <div className="hidden items-center gap-2 rounded-full border border-line/60 bg-white/40 px-3 py-1.5 sm:flex">
                    <span className="text-sm font-medium text-ink leading-none">{viewer.name}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-ink/40 leading-none">
                      {viewer.role}
                    </span>
                  </div>
                  {viewer.role === "STUDENT" && (
                    <>
                      <Link
                        href="/"
                        className="hidden rounded-full border border-accent px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent hover:text-white sm:block"
                      >
                        Mission control
                      </Link>
                      <Link
                        href="/students/me"
                        className="hidden rounded-full border border-line bg-white/70 px-3 py-1.5 text-sm font-medium text-ink transition hover:border-accent md:block"
                      >
                        Portfolio
                      </Link>
                    </>
                  )}
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full border border-accent bg-accent px-4 py-1.5 text-sm font-medium text-white transition hover:bg-accent/90"
                >
                  Sign in
                </Link>
              )}
              <MobileNav items={navItems} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 lg:px-8 print:max-w-none print:px-0 print:py-0">
        {children}
      </main>
    </div>
  );
}
