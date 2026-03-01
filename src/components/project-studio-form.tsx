"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ProjectType } from "@prisma/client";

import { getLaneTemplate, projectTypeToPublicationType } from "@/lib/publications";
import {
  laneTagLabels,
  projectTypeLabels,
  publicationTypeLabels,
  type ArtifactLink,
  type LaneSectionEntry,
  type LaneTag,
  type ReferenceEntry
} from "@/lib/types";

type ProjectStudioFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  viewerId: string;
  issues: Array<{ id: string; title: string; severity: number }>;
  teams: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  proposals: Array<{ id: string; title: string; issue: { title: string } }>;
  initial?: {
    id?: string;
    title: string;
    summary: string;
    abstract: string;
    essentialQuestion: string;
    methodsSummary: string;
    projectType: ProjectType;
    lanePrimary: LaneTag;
    laneTags: LaneTag[];
    issueIds: string[];
    teamId: string;
    supportingProposalId: string;
    artifactLinks: ArtifactLink[];
    references: ReferenceEntry[];
    keywords: string[];
    keyTakeaways: string[];
    publicationSlug: string;
    findingsMd: string;
    overview: string;
    context: string;
    evidence: string;
    analysis: string;
    recommendations: string;
    reflection: string;
    laneSections: LaneSectionEntry[];
    collaboratorIds: string[];
  };
  intentLabel: string;
};

type ProjectDraftSnapshot = {
  title: string;
  abstract: string;
  essentialQuestion: string;
  methodsSummary: string;
  overview: string;
  evidence: string;
  analysis: string;
  recommendations: string;
  references: string;
  laneSections: Array<{ key: string; value: string }>;
};

type DraftCheck = {
  completeCount: number;
  totalCount: number;
  critical: string[];
  caution: string[];
};

type AutosaveState = {
  tone: "idle" | "saving" | "saved" | "error";
  message: string;
};

type StepStatusItem = {
  label: string;
  ready: boolean;
  detail: string;
};

const laneOrder: LaneTag[] = [
  "TOOL_BUILDERS",
  "POLICY_REFORM_ARCHITECTS",
  "STRATEGIC_OPERATORS",
  "ECONOMIC_INVESTIGATORS"
];

function textReady(value: string) {
  return value.trim().length >= 12;
}

function readProjectDraft(form: HTMLFormElement): ProjectDraftSnapshot {
  const formData = new FormData(form);
  const laneSectionKeys = String(formData.get("laneSectionKeys") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    title: String(formData.get("title") ?? ""),
    abstract: String(formData.get("abstract") ?? ""),
    essentialQuestion: String(formData.get("essentialQuestion") ?? ""),
    methodsSummary: String(formData.get("methodsSummary") ?? ""),
    overview: String(formData.get("overview") ?? ""),
    evidence: String(formData.get("evidence") ?? ""),
    analysis: String(formData.get("analysis") ?? ""),
    recommendations: String(formData.get("recommendations") ?? ""),
    references: String(formData.get("references") ?? ""),
    laneSections: laneSectionKeys.map((key) => ({
      key,
      value: String(formData.get(`laneSectionValue_${key}`) ?? "")
    }))
  };
}

function hasAnyDraftContent(snapshot: ProjectDraftSnapshot) {
  return [
    snapshot.title,
    snapshot.abstract,
    snapshot.essentialQuestion,
    snapshot.methodsSummary,
    snapshot.overview,
    snapshot.evidence,
    snapshot.analysis,
    snapshot.recommendations,
    ...snapshot.laneSections.map((section) => section.value)
  ].some((value) => value.trim().length > 0);
}

function buildDraftCheck(snapshot: ProjectDraftSnapshot, lane: LaneTag): DraftCheck {
  const template = getLaneTemplate(lane);
  const critical: string[] = [];
  const caution: string[] = [];

  if (!textReady(snapshot.title)) {
    critical.push("Add a clear title.");
  }
  if (!textReady(snapshot.abstract)) {
    critical.push("Write a short abstract that explains the work.");
  }
  if (!textReady(snapshot.essentialQuestion)) {
    critical.push("State the research question or mission.");
  }
  if (!textReady(snapshot.overview)) {
    critical.push("Strengthen the overview.");
  }
  if (!textReady(snapshot.evidence)) {
    critical.push("Name the evidence or inputs you used.");
  }
  if (!textReady(snapshot.analysis)) {
    critical.push("Explain the main pattern or analysis.");
  }
  if (!textReady(snapshot.recommendations)) {
    critical.push("End with a concrete recommendation.");
  }

  if (!textReady(snapshot.methodsSummary)) {
    caution.push("The methods summary still needs more detail.");
  }
  if (!textReady(snapshot.references)) {
    caution.push("Add at least one reference or source link.");
  }
  if (snapshot.laneSections.some((section) => !textReady(section.value))) {
    caution.push(`One or more ${template.outputLabel.toLowerCase()} sections still need more detail.`);
  }

  const checks = [
    textReady(snapshot.title),
    textReady(snapshot.abstract),
    textReady(snapshot.essentialQuestion),
    textReady(snapshot.methodsSummary),
    textReady(snapshot.overview),
    textReady(snapshot.evidence),
    textReady(snapshot.analysis),
    textReady(snapshot.recommendations),
    textReady(snapshot.references),
    snapshot.laneSections.every((section) => textReady(section.value))
  ];

  return {
    completeCount: checks.filter(Boolean).length,
    totalCount: checks.length,
    critical,
    caution
  };
}

function buildStepStatusItems(snapshot: ProjectDraftSnapshot, lane: LaneTag) {
  const template = getLaneTemplate(lane);

  return {
    foundation: [
      {
        label: "Title",
        ready: textReady(snapshot.title),
        detail: "A new reader should understand what this publication is about."
      },
      {
        label: "Abstract",
        ready: textReady(snapshot.abstract),
        detail: "Summarize the work in two or three calm sentences."
      },
      {
        label: "Question or mission",
        ready: textReady(snapshot.essentialQuestion),
        detail: "State the research question or design mission clearly."
      },
      {
        label: "Methods summary",
        ready: textReady(snapshot.methodsSummary),
        detail: "Explain how the work was investigated or built."
      }
    ] satisfies StepStatusItem[],
    body: [
      {
        label: template.overviewLabel,
        ready: textReady(snapshot.overview),
        detail: "Open with the main point so the reader knows where this is going."
      },
      {
        label: "Evidence",
        ready: textReady(snapshot.evidence),
        detail: "Name the records, inputs, or observations you used."
      },
      {
        label: "Analysis",
        ready: textReady(snapshot.analysis),
        detail: "Explain the pattern, mechanism, or meaning behind the evidence."
      },
      {
        label: "Recommendation",
        ready: textReady(snapshot.recommendations),
        detail: "End with a concrete action or next step."
      },
      {
        label: template.outputLabel + " sections",
        ready:
          snapshot.laneSections.length > 0 &&
          snapshot.laneSections.every((section) => textReady(section.value)),
        detail: "Finish each lane-specific section so the final publication reads cleanly."
      }
    ] satisfies StepStatusItem[],
    publishing: [
      {
        label: "References",
        ready: textReady(snapshot.references),
        detail: "Add at least one source that supports the publication."
      }
    ] satisfies StepStatusItem[]
  };
}

function statusTone(ready: boolean) {
  return ready
    ? "border-success/30 bg-success/10 text-success"
    : "border-warn/30 bg-warn/10 text-warn";
}

export function ProjectStudioForm({
  action,
  viewerId,
  issues,
  teams,
  users,
  proposals,
  initial,
  intentLabel
}: ProjectStudioFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const [lanePrimary, setLanePrimary] = useState<LaneTag>(
    initial?.lanePrimary ?? "ECONOMIC_INVESTIGATORS"
  );
  const [draftId, setDraftId] = useState(initial?.id ?? "");
  const [draftSnapshot, setDraftSnapshot] = useState<ProjectDraftSnapshot>({
    title: initial?.title ?? "",
    abstract: initial?.abstract ?? "",
    essentialQuestion: initial?.essentialQuestion ?? "",
    methodsSummary: initial?.methodsSummary ?? "",
    overview: initial?.overview ?? "",
    evidence: initial?.evidence ?? "",
    analysis: initial?.analysis ?? "",
    recommendations: initial?.recommendations ?? "",
    references:
      initial?.references
        .map((reference) =>
          [reference.label, reference.url, reference.sourceType, reference.note ?? ""]
            .filter(Boolean)
            .join(" | ")
        )
        .join("\n") ?? "",
    laneSections: initial?.laneSections.map((section) => ({
      key: section.key,
      value: section.value
    })) ?? []
  });
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({
    tone: "idle",
    message: initial?.id ? "Draft loaded." : "Autosave starts after you begin writing."
  });
  const [draftCheck, setDraftCheck] = useState<DraftCheck>({
    completeCount: 0,
    totalCount: 10,
    critical: [],
    caution: []
  });

  const template = getLaneTemplate(lanePrimary);
  const currentProjectType =
    initial?.projectType ??
    (lanePrimary === "TOOL_BUILDERS"
      ? ProjectType.TOOL
      : lanePrimary === "STRATEGIC_OPERATORS"
        ? ProjectType.STRATEGY
        : lanePrimary === "POLICY_REFORM_ARCHITECTS"
          ? ProjectType.PROPOSAL_SUPPORT
          : ProjectType.INVESTIGATION);

  const laneSections = template.laneSections.map((section) => {
    const existing = initial?.laneSections.find((entry) => entry.key === section.key);

    return {
      key: section.key,
      title: existing?.title ?? section.title,
      prompt: existing?.prompt ?? section.prompt,
      value: existing?.value ?? ""
    };
  });

  useEffect(() => {
    if (!formRef.current) {
      return;
    }

    const snapshot = readProjectDraft(formRef.current);
    setDraftSnapshot(snapshot);
    setDraftCheck(buildDraftCheck(snapshot, lanePrimary));
  }, [lanePrimary]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  async function runAutosave() {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const snapshot = readProjectDraft(form);
    setDraftSnapshot(snapshot);
    const check = buildDraftCheck(snapshot, lanePrimary);
    setDraftCheck(check);

    if (!hasAnyDraftContent(snapshot) && !draftId) {
      return;
    }

    const payload = new FormData(form);
    if (draftId) {
      payload.set("projectId", draftId);
    }

    setAutosaveState({
      tone: "saving",
      message: "Saving draft..."
    });

    try {
      const response = await fetch("/api/studio/project-autosave", {
        method: "POST",
        body: payload
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Autosave failed.");
      }

      if (result.id && result.id !== draftId) {
        setDraftId(result.id);
        if (!initial?.id && result.editUrl) {
          router.replace(result.editUrl);
        }
      }

      setAutosaveState({
        tone: "saved",
        message: `Draft saved at ${new Date(result.savedAt).toLocaleTimeString()}`
      });
    } catch (error) {
      setAutosaveState({
        tone: "error",
        message: error instanceof Error ? error.message : "Autosave failed."
      });
    }
  }

  function scheduleAutosave() {
    if (!formRef.current) {
      return;
    }

    const snapshot = readProjectDraft(formRef.current);
    setDraftSnapshot(snapshot);
    setDraftCheck(buildDraftCheck(snapshot, lanePrimary));

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void runAutosave();
    }, 900);
  }

  const stepStatus = buildStepStatusItems(draftSnapshot, lanePrimary);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-6"
      onInput={scheduleAutosave}
      onChange={scheduleAutosave}
    >
      <input type="hidden" name="projectId" value={draftId} readOnly />

      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Studio progress</p>
            <h3 className="mt-3 font-display text-2xl text-ink">Live draft check</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
              This panel updates while you type. It shows what is already strong, what still needs
              work, and whether the draft is saving in the background.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm text-ink/70">
            {draftCheck.completeCount} of {draftCheck.totalCount} core parts in place
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="font-medium text-ink">Autosave</p>
            <p
              className={`mt-3 text-sm ${
                autosaveState.tone === "error"
                  ? "text-danger"
                  : autosaveState.tone === "saved"
                    ? "text-success"
                    : "text-ink/68"
              }`}
            >
              {autosaveState.message}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-medium text-ink">Still missing</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                {draftCheck.critical.length > 0 ? (
                  draftCheck.critical.map((line) => (
                    <li key={line} className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                      {line}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                    Core sections look complete.
                  </li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-medium text-ink">Needs smoothing</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                {draftCheck.caution.length > 0 ? (
                  draftCheck.caution.map((line) => (
                    <li key={line} className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                      {line}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                    No extra cautions right now.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 1</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl text-ink">Choose the lane and output format</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
              Start by choosing the kind of research you are making. The lane changes the
              final publication format and the writing prompts below.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm text-ink/70">
            Final output:{" "}
            <span className="font-medium text-ink">
              {publicationTypeLabels[projectTypeToPublicationType(currentProjectType, lanePrimary)]}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <select
            name="lanePrimary"
            value={lanePrimary}
            onChange={(event) => setLanePrimary(event.target.value as LaneTag)}
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            {laneOrder.map((lane) => (
              <option key={lane} value={lane}>
                {laneTagLabels[lane]}
              </option>
            ))}
          </select>
          <select
            name="projectType"
            defaultValue={initial?.projectType ?? currentProjectType}
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            {Object.entries(projectTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {laneOrder.map((lane) => (
            <label
              key={lane}
              className="flex items-start gap-3 rounded-2xl border border-line bg-white/60 px-4 py-4 text-sm text-ink/72"
            >
              <input
                type="checkbox"
                name="laneTags"
                value={lane}
                defaultChecked={initial?.laneTags.includes(lane) ?? lane === lanePrimary}
                className="mt-1 rounded"
              />
              <span>
                <span className="block font-medium text-ink">{laneTagLabels[lane]}</span>
                <span className="mt-1 block leading-6 text-ink/62">
                  {getLaneTemplate(lane).outputLabel}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 2</p>
        <h3 className="mt-3 font-display text-2xl text-ink">Choose the league context</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
          Decide which issue, team, or proposal your work is speaking to so a reader can
          place your research inside the BOW Universe.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="font-medium text-ink">Linked issues</p>
            <div className="mt-3 max-h-56 space-y-2 overflow-auto">
              {issues.map((issue) => (
                <label key={issue.id} className="flex items-center gap-2 text-sm text-ink/72">
                  <input
                    type="checkbox"
                    name="issueIds"
                    value={issue.id}
                    defaultChecked={initial?.issueIds.includes(issue.id)}
                    className="rounded"
                  />
                  {issue.title} (severity {issue.severity})
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <select
              name="teamId"
              defaultValue={initial?.teamId ?? ""}
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">No linked team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>

            <select
              name="supportingProposalId"
              defaultValue={initial?.supportingProposalId ?? ""}
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            >
              <option value="">No supporting proposal</option>
              {proposals.map((proposal) => (
                <option key={proposal.id} value={proposal.id}>
                  {proposal.title} · {proposal.issue.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 3</p>
        <h3 className="mt-3 font-display text-2xl text-ink">Write the publication foundation</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
          These fields become the opening layer of the finished publication. Keep them calm,
          clear, and specific enough that a new reader can follow your idea quickly.
        </p>

        <div className="mt-5 grid gap-4">
          <input
            name="title"
            defaultValue={initial?.title ?? ""}
            placeholder="Title"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="summary"
            defaultValue={initial?.summary ?? ""}
            rows={3}
            placeholder="Short summary"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="abstract"
            defaultValue={initial?.abstract ?? ""}
            rows={4}
            placeholder="Abstract: explain what this project studies, what evidence it uses, and what it finds."
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            name="essentialQuestion"
            defaultValue={initial?.essentialQuestion ?? ""}
            placeholder="Research question or mission"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="methodsSummary"
            defaultValue={initial?.methodsSummary ?? ""}
            rows={3}
            placeholder="Methods summary: how did you investigate or build this?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            name="publicationSlug"
            defaultValue={initial?.publicationSlug ?? ""}
            placeholder="Optional publication slug"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stepStatus.foundation.map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-white/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{item.label}</p>
                <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] ${statusTone(item.ready)}`}>
                  {item.ready ? "Ready" : "Keep writing"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/66">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 4</p>
        <h3 className="mt-3 font-display text-2xl text-ink">Build the research body</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
          This section becomes the main body of the final brief. Each part has a job. Write
          what the reader needs to understand, not just what you did.
        </p>

        <div className="mt-5 grid gap-4">
          <textarea
            name="overview"
            defaultValue={initial?.overview ?? ""}
            rows={4}
            placeholder={template.examples[0]?.body ?? "Overview"}
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="context"
            defaultValue={initial?.context ?? ""}
            rows={4}
            placeholder="Context: what should a reader know before they read your findings?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="evidence"
            defaultValue={initial?.evidence ?? ""}
            rows={5}
            placeholder="Evidence: what records, observations, or source material did you use?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="analysis"
            defaultValue={initial?.analysis ?? ""}
            rows={5}
            placeholder="Analysis: what patterns or ideas matter most?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="recommendations"
            defaultValue={initial?.recommendations ?? ""}
            rows={5}
            placeholder="Recommendation: what should happen next because of your work?"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <input type="hidden" name="laneSectionKeys" value={laneSections.map((section) => section.key).join(",")} />

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {laneSections.map((section) => (
            <div key={section.key} className="rounded-2xl border border-line bg-white/55 p-4">
              <input type="hidden" name={`laneSectionTitle_${section.key}`} value={section.title} />
              <input type="hidden" name={`laneSectionPrompt_${section.key}`} value={section.prompt} />
              <p className="font-medium text-ink">{section.title}</p>
              <p className="mt-2 text-sm leading-6 text-ink/64">{section.prompt}</p>
              <textarea
                name={`laneSectionValue_${section.key}`}
                defaultValue={section.value}
                rows={5}
                className="mt-3 w-full rounded-2xl border border-line bg-white/85 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>

        <textarea
          name="reflection"
          defaultValue={initial?.reflection ?? ""}
          rows={4}
          placeholder="Reflection: what still feels uncertain, and what would improve the work next?"
          className="mt-4 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stepStatus.body.map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-white/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{item.label}</p>
                <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] ${statusTone(item.ready)}`}>
                  {item.ready ? "Ready" : "Needs work"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/66">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 5</p>
        <h3 className="mt-3 font-display text-2xl text-ink">Add evidence links and collaborators</h3>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <textarea
            name="artifactLinks"
            rows={5}
            defaultValue={
              initial?.artifactLinks.map((link) => `${link.label} | ${link.url}`).join("\n") ?? ""
            }
            placeholder="Artifact links, one per line: Label | https://..."
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="references"
            rows={5}
            defaultValue={
              initial?.references
                .map((reference) =>
                  [reference.label, reference.url, reference.sourceType, reference.note ?? ""]
                    .filter(Boolean)
                    .join(" | ")
                )
                .join("\n") ?? ""
            }
            placeholder="References, one per line: Label | https://... | DATASET | note"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            name="keywords"
            defaultValue={initial?.keywords.join(", ") ?? ""}
            placeholder="Keywords separated by commas"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            name="keyTakeaways"
            rows={4}
            defaultValue={initial?.keyTakeaways.join("\n") ?? ""}
            placeholder="Key takeaways, one per line"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-white/55 p-4">
          <p className="font-medium text-ink">Collaborators</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {users
              .filter((user) => user.id !== viewerId)
              .map((user) => (
                <label key={user.id} className="flex items-center gap-2 text-sm text-ink/72">
                  <input
                    type="checkbox"
                    name="collaboratorIds"
                    value={user.id}
                    defaultChecked={initial?.collaboratorIds.includes(user.id)}
                    className="rounded"
                  />
                  {user.name}
                </label>
              ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:max-w-md">
          {stepStatus.publishing.map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-white/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{item.label}</p>
                <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] ${statusTone(item.ready)}`}>
                  {item.ready ? "Ready" : "Needed"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/66">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Step 6</p>
        <h3 className="mt-3 font-display text-2xl text-ink">Review before you submit</h3>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="font-medium text-ink">What strong work includes</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
              {template.checklist.map((item) => (
                <li key={item.key} className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                  <span className="font-medium text-ink">{item.label}</span>
                  <span className="block text-ink/62">{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="font-medium text-ink">External publication readiness</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
              {template.externalReadinessRules.map((rule) => (
                <li key={rule} className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <textarea
          name="findingsMd"
          rows={6}
          defaultValue={initial?.findingsMd ?? ""}
          placeholder="Optional legacy markdown summary. If you leave this empty, the studio sections above become the saved publication body."
          className="mt-4 w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            name="intent"
            value="DRAFT"
            className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-ink"
          >
            Save draft
          </button>
          <button
            type="submit"
            name="intent"
            value="SUBMITTED"
            className="rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            {intentLabel}
          </button>
        </div>
      </section>
    </form>
  );
}
