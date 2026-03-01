import Link from "next/link";

import { Badge } from "@/components/badge";

type AdminQueueSummaryProps = {
  items: Array<{
    title: string;
    count: number;
    detail: string;
    href: string;
    tone?: "default" | "warn" | "success";
  }>;
};

export function AdminQueueSummary({ items }: AdminQueueSummaryProps) {
  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Daily queue</p>
          <h3 className="mt-3 font-display text-2xl text-ink">What needs action now</h3>
        </div>
        <Badge>{items.length} lanes</Badge>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded-2xl border border-line bg-white/65 p-4 hover:border-accent"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-ink">{item.title}</p>
              <Badge tone={item.tone}>{item.count}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/68">{item.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
