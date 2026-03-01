type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <article className="panel p-5">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">{label}</p>
      <p className="mt-4 font-display text-4xl text-ink">{value}</p>
      <p className="mt-3 text-sm leading-6 text-ink/65">{detail}</p>
    </article>
  );
}
