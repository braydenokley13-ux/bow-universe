import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "default" | "success" | "warn" | "danger" | "info";
  size?: "sm" | "md";
};

export function Badge({ children, tone = "default", size = "md" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full font-mono uppercase tracking-[0.2em]",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-3 py-1 text-[11px]",
        tone === "default" && "bg-line text-ink/70",
        tone === "success" && "bg-success text-white",
        tone === "warn"    && "bg-warn text-white",
        tone === "danger"  && "bg-danger text-white",
        tone === "info"    && "bg-info text-white"
      )}
    >
      {children}
    </span>
  );
}
