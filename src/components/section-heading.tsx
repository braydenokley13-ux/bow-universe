import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeading({ eyebrow, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow ? (
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">{eyebrow}</p>
      ) : null}
      <div className="space-y-1">
        <h2 className="font-display text-3xl text-ink">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-ink/70">{description}</p> : null}
      </div>
    </div>
  );
}
