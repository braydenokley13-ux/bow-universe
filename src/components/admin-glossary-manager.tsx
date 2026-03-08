"use client";

import { useState } from "react";

import { Badge } from "@/components/badge";
import type { saveGlossaryTermAction, deleteGlossaryTermAction } from "@/server/actions";

type GlossaryTerm = {
  id: string;
  slug: string;
  term: string;
  definition: string;
  bowExample: string | null;
  category: string | null;
  sortOrder: number;
};

type Props = {
  terms: GlossaryTerm[];
  saveAction: typeof saveGlossaryTermAction;
  deleteAction: typeof deleteGlossaryTermAction;
};

function TermForm({
  term,
  saveAction,
  onCancel
}: {
  term?: GlossaryTerm;
  saveAction: typeof saveGlossaryTermAction;
  onCancel: () => void;
}) {
  return (
    <form action={saveAction} className="rounded-2xl border border-accent/30 bg-white/80 p-5 space-y-4">
      {term && <input type="hidden" name="id" value={term.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Term *</label>
          <input
            name="term"
            required
            defaultValue={term?.term ?? ""}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
            placeholder="e.g. Luxury Tax"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Slug *</label>
          <input
            name="slug"
            required
            defaultValue={term?.slug ?? ""}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-mono focus:border-accent focus:outline-none"
            placeholder="e.g. luxury-tax"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Definition *</label>
        <textarea
          name="definition"
          required
          defaultValue={term?.definition ?? ""}
          rows={3}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          placeholder="Explain the concept in plain language..."
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">BOW Universe Example</label>
        <textarea
          name="bowExample"
          defaultValue={term?.bowExample ?? ""}
          rows={2}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          placeholder="e.g. In Season 3, the Westside Wolves paid $4.2M in luxury tax after signing..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Category</label>
          <input
            name="category"
            defaultValue={term?.category ?? ""}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
            placeholder="e.g. Salary Cap, Economics..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Sort Order</label>
          <input
            name="sortOrder"
            type="number"
            defaultValue={term?.sortOrder ?? 0}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          {term ? "Save changes" : "Add term"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink/70"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteButton({
  termId,
  termName,
  deleteAction
}: {
  termId: string;
  termName: string;
  deleteAction: typeof deleteGlossaryTermAction;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <form action={deleteAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={termId} />
        <span className="text-xs text-ink/60">Delete &ldquo;{termName}&rdquo;?</span>
        <button
          type="submit"
          className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
        >
          Yes, delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-ink/50 hover:underline"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs text-red-500 hover:underline"
    >
      Delete
    </button>
  );
}

export function AdminGlossaryManager({ terms, saveAction, deleteAction }: Props) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const categories = Array.from(new Set(terms.map((t) => t.category).filter(Boolean))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Glossary</p>
          <h3 className="mt-1 font-display text-2xl text-ink">Economic term library</h3>
          <p className="mt-1 text-sm text-ink/60">
            {terms.length} terms across {categories.length} categories
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            + Add term
          </button>
        )}
      </div>

      {creating && (
        <TermForm
          saveAction={saveAction}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="space-y-3">
        {terms.map((term) => (
          <div key={term.id} className="rounded-2xl border border-line bg-white/60 p-4">
            {editingId === term.id ? (
              <TermForm
                term={term}
                saveAction={saveAction}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{term.term}</span>
                    {term.category && <Badge>{term.category}</Badge>}
                    <span className="font-mono text-xs text-ink/40">{term.slug}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-ink/70 line-clamp-2">{term.definition}</p>
                  {term.bowExample && (
                    <p className="mt-1 text-xs text-ink/50 italic line-clamp-1">eg. {term.bowExample}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingId(term.id)}
                    className="text-xs text-accent hover:underline"
                  >
                    Edit
                  </button>
                  <DeleteButton
                    termId={term.id}
                    termName={term.term}
                    deleteAction={deleteAction}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {terms.length === 0 && !creating && (
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink/50">
            No glossary terms yet. Click &ldquo;Add term&rdquo; to create the first one.
          </div>
        )}
      </div>
    </div>
  );
}
