"use client";

type StarterChipRowProps = {
  starters: string[];
  onSelect: (starter: string) => void;
};

export function StarterChipRow({ starters, onSelect }: StarterChipRowProps) {
  if (starters.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {starters.map((starter) => (
        <button
          key={starter}
          type="button"
          onClick={() => onSelect(starter)}
          className="rounded-full border border-line bg-white/80 px-3 py-2 text-left text-xs leading-5 text-ink/78 transition hover:border-accent hover:text-ink"
        >
          {starter}
        </button>
      ))}
    </div>
  );
}
