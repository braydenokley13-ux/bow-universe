type SectionJumpNavProps = {
  title?: string;
  sections: Array<{
    id: string;
    label: string;
  }>;
};

export function SectionJumpNav({ title = "Jump to section", sections }: SectionJumpNavProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <nav className="rounded-[28px] border border-line bg-white/75 p-4 shadow-panel">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{title}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-line bg-white/80 px-3 py-2 text-sm text-ink/75 hover:border-accent"
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
