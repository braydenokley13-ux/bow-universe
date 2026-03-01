"use client";

export function PrintButton({ label = "Print article" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hide rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
    >
      {label}
    </button>
  );
}
