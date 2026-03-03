"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type MainNavProps = {
  items: Array<{ href: string; label: string }>;
};

export function MainNav({ items }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 overflow-x-auto pb-0.5">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              active
                ? "border-accent bg-accent text-white shadow-panel"
                : "border-line bg-white/55 text-ink/75 hover:border-accent hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
