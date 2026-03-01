import Link from "next/link";

import { cn } from "@/lib/utils";

type NextActionCardProps = {
  eyebrow?: string;
  title?: string;
  body: string;
  href?: string;
  ctaLabel?: string;
  tone?: "default" | "warn" | "success";
};

export function NextActionCard({
  eyebrow = "Next move",
  title = "What to do next",
  body,
  href,
  ctaLabel = "Open",
  tone = "default"
}: NextActionCardProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border p-5 shadow-panel",
        tone === "default" && "border-accent/20 bg-accent/5",
        tone === "warn" && "border-warn/20 bg-warn/10",
        tone === "success" && "border-success/20 bg-success/10"
      )}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
      <h3 className="mt-3 font-display text-2xl text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink/70">{body}</p>
      {href ? (
        <Link
          href={href}
          className="mt-4 inline-flex rounded-full border border-line bg-white/85 px-4 py-2 text-sm font-medium text-ink"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}
