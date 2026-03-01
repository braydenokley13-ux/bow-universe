import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "default" | "success" | "warn" | "danger";
};

export function Badge({ children, tone = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em]",
        tone === "default" && "border-line bg-white/70 text-ink/75",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "warn" && "border-warn/30 bg-warn/10 text-warn",
        tone === "danger" && "border-danger/30 bg-danger/10 text-danger"
      )}
    >
      {children}
    </span>
  );
}
