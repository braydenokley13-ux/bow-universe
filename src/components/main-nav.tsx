"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  Compass,
  FileText,
  FlaskConical,
  FolderKanban,
  Home,
  Newspaper,
  Settings,
  Trophy,
  Users
} from "lucide-react";

import { cn } from "@/lib/utils";

const iconMap = {
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

type IconName = keyof typeof iconMap;

type MainNavProps = {
  items: Array<{ href: string; label: string; icon?: string }>;
};

export function MainNav({ items }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        const Icon = item.icon && item.icon in iconMap ? iconMap[item.icon as IconName] : null;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-white"
                : "text-ink/70 hover:bg-mist hover:text-ink"
            )}
          >
            {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
