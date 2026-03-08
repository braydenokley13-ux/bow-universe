import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  action?: ReactNode;
};

export function SectionHeading({ eyebrow, title, description, className, action }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-2">
        {eyebrow ? (
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">{eyebrow}</p>
        ) : null}
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
          {description ? <p className="max-w-3xl text-[15px] leading-6 text-ink/70">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="flex-shrink-0">{action}</div> : null}
    </div>
  );
}
