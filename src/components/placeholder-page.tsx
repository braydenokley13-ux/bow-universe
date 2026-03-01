import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  checkpoints: string[];
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  checkpoints
}: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl text-ink">Scaffold checkpoint</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
              This route exists so the application structure is visible from the first diff.
              Real data, forms, and workflow logic land in later stages.
            </p>
          </div>
          <Badge>Diff 00</Badge>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {checkpoints.map((checkpoint) => (
            <div key={checkpoint} className="rounded-2xl border border-line bg-white/60 p-4 text-sm text-ink/75">
              {checkpoint}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
