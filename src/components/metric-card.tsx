type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <article className="panel p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-accent/80">{label}</p>
      <p className="mt-3 font-display text-4xl font-light text-ink">{value}</p>
      <p className="mt-2.5 text-[13px] leading-5 text-ink/55">{detail}</p>
    </article>
  );
}
