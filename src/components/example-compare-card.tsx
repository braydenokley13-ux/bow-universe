type ExampleCompareCardProps = {
  weakExample: string;
  strongExample: string;
};

export function ExampleCompareCard({ weakExample, strongExample }: ExampleCompareCardProps) {
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-danger">Weak example</p>
        <p className="mt-3 text-sm leading-6 text-ink/72">{weakExample}</p>
      </div>
      <div className="rounded-2xl border border-success/20 bg-success/10 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-success">Strong example</p>
        <p className="mt-3 text-sm leading-6 text-ink/72">{strongExample}</p>
      </div>
    </div>
  );
}
