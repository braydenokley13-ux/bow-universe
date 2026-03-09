import Link from "next/link";

type StudentFeatureGateProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function StudentFeatureGate({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel
}: StudentFeatureGateProps) {
  return (
    <section className="panel p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
      <h3 className="mt-3 font-display text-2xl text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink/70">{description}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={primaryHref}
          className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
