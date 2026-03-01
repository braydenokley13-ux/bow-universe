import { Badge } from "@/components/badge";
import type { ReviewBucket, ReviewReadinessResult } from "@/lib/review-readiness";

type ReadinessBucketListProps = {
  buckets: ReviewReadinessResult["buckets"];
};

function toneForBucket(bucket: ReviewBucket) {
  switch (bucket) {
    case "must_fix":
      return "danger" as const;
    case "should_strengthen":
      return "warn" as const;
    default:
      return "success" as const;
  }
}

export function ReadinessBucketList({ buckets }: ReadinessBucketListProps) {
  return (
    <div className="space-y-4">
      {(Object.keys(buckets) as ReviewBucket[]).map((bucket) => {
        const group = buckets[bucket];
        return (
          <section key={bucket} className="rounded-2xl border border-line bg-white/65 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-ink">{group.title}</p>
              <Badge tone={toneForBucket(bucket)}>{group.items.length}</Badge>
            </div>
            {group.items.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                {group.items.map((item) => (
                  <li key={item} className="rounded-2xl border border-line bg-white/80 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-ink/60">Nothing in this bucket right now.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
