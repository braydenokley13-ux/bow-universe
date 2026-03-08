"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Compass,
  FileText,
  FlaskConical,
  FolderKanban,
  Home,
  Menu,
  Newspaper,
  Settings,
  Trophy,
  Users,
  X
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Compass,
  Newspaper,
  Trophy,
  Users,
  BookOpen,
  AlertCircle,
  FolderKanban,
  FileText,
  FlaskConical,
  Settings
};

type NavItem = {
  href: string;
  label: string;
  icon?: string;
};

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="relative lg:hidden">
      {/* Hamburger */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-mist text-ink/65 transition hover:border-accent hover:text-ink"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <nav className="absolute right-0 top-10 z-50 min-w-[200px] overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-card">
            {items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon && item.icon in iconMap ? iconMap[item.icon] : null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-white"
                      : "text-ink/75 hover:bg-mist hover:text-ink"
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0 opacity-70" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
