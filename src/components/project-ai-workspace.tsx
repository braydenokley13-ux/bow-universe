"use client";

import { ProjectMilestoneKey } from "@prisma/client";
import { useEffect, useState } from "react";

import type {
  AdversaryResponse,
  ArgumentResponse,
  OrientResponse,
  QualityResponse,
  ResearchResponse,
  TeamPulseResponse,
  WritingResponse
} from "@/server/ai/types";

type AiEnvelope<T> = {
  artifactId: string;
  conversationId: string | null;
  cached: boolean;
  provider: string;
  model: string;
  promptVersion: string;
  bodyMd: string;
  sources: Array<{
    title: string;
    url?: string | null;
    sourceType: string;
    note?: string;
    excerptMd?: string;
  }>;
  data: T;
};

type ProjectAiWorkspaceProps = {
  projectId: string;
  milestoneKey: ProjectMilestoneKey;
  collaboratorCount: number;
  coreBuildDraft: string;
};

type RequestState = {
  loading: boolean;
  error: string | null;
};

function initialRequestState(): RequestState {
  return {
    loading: false,
    error: null
  };
}

function prettyMilestoneLabel(value: ProjectMilestoneKey) {
  return value.toLowerCase().replaceAll("_", " ");
}

function formatSourceLabel(source: { title: string; sourceType: string; note?: string }) {
  return `${source.title}${source.note ? ` - ${source.note}` : ""} (${source.sourceType})`;
}

async function postAi<T>(path: string, body: Record<string, unknown>): Promise<AiEnvelope<T>> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store",
    body: JSON.stringify(body)
  });

  const payload = (await response.json()) as AiEnvelope<T> | { error?: string };

  if (!response.ok) {
    throw new Error(
      typeof payload === "object" && payload && "error" in payload && payload.error
        ? payload.error
        : "AI request failed."
    );
  }

  return payload as AiEnvelope<T>;
}

function ResultMeta({ result }: { result: Pick<AiEnvelope<unknown>, "cached" | "provider" | "model"> }) {
  return (
    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ink/50">
      {result.cached ? "cached" : "fresh"} · {result.provider.toLowerCase()} · {result.model}
    </p>
  );
}

function ResultSources({ sources }: { sources: Array<{ title: string; url?: string | null; sourceType: string; note?: string }> }) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Sources</p>
      {sources.map((source) =>
        source.url ? (
          <a
            key={`${source.title}-${source.url}`}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl border border-line bg-white/80 px-3 py-3 text-sm leading-6 text-ink/72 hover:border-accent"
          >
            {formatSourceLabel(source)}
          </a>
        ) : (
          <div
            key={`${source.title}-${source.sourceType}`}
            className="rounded-2xl border border-line bg-white/80 px-3 py-3 text-sm leading-6 text-ink/72"
          >
            {formatSourceLabel(source)}
          </div>
        )
      )}
    </div>
  );
}

export function ProjectAiWorkspace({
  projectId,
  milestoneKey,
  collaboratorCount,
  coreBuildDraft
}: ProjectAiWorkspaceProps) {
  const [researchPrompt, setResearchPrompt] = useState("");
  const [orient, setOrient] = useState<AiEnvelope<OrientResponse> | null>(null);
  const [research, setResearch] = useState<AiEnvelope<ResearchResponse> | null>(null);
  const [argument, setArgument] = useState<AiEnvelope<ArgumentResponse> | null>(null);
  const [adversary, setAdversary] = useState<AiEnvelope<AdversaryResponse> | null>(null);
  const [writing, setWriting] = useState<AiEnvelope<WritingResponse> | null>(null);
  const [quality, setQuality] = useState<AiEnvelope<QualityResponse> | null>(null);
  const [teamPulse, setTeamPulse] = useState<AiEnvelope<TeamPulseResponse> | null>(null);
  const [orientState, setOrientState] = useState<RequestState>(initialRequestState);
  const [researchState, setResearchState] = useState<RequestState>(initialRequestState);
  const [argumentState, setArgumentState] = useState<RequestState>(initialRequestState);
  const [adversaryState, setAdversaryState] = useState<RequestState>(initialRequestState);
  const [writingState, setWritingState] = useState<RequestState>(initialRequestState);
  const [qualityState, setQualityState] = useState<RequestState>(initialRequestState);
  const [teamPulseState, setTeamPulseState] = useState<RequestState>(initialRequestState);

  async function loadOrient() {
    setOrientState({
      loading: true,
      error: null
    });

    try {
      const result = await postAi<OrientResponse>("/api/ai/orient", {
        projectId
      });
      setOrient(result);
      setOrientState(initialRequestState());
    } catch (error) {
      setOrientState({
        loading: false,
        error: error instanceof Error ? error.message : "Orientation failed."
      });
    }
  }

  async function loadTeamPulse() {
    setTeamPulseState({
      loading: true,
      error: null
    });

    try {
      const result = await postAi<TeamPulseResponse>("/api/ai/team-pulse", {
        projectId
      });
      setTeamPulse(result);
      setTeamPulseState(initialRequestState());
    } catch (error) {
      setTeamPulseState({
        loading: false,
        error: error instanceof Error ? error.message : "Team pulse failed."
      });
    }
  }

  async function loadResearch() {
    setResearchState({
      loading: true,
      error: null
    });

    try {
      const result = await postAi<ResearchResponse>("/api/ai/research", {
        projectId,
        userMessage: researchPrompt.trim() || null
      });
      setResearch(result);
      setResearchState(initialRequestState());
    } catch (error) {
      setResearchState({
        loading: false,
        error: error instanceof Error ? error.message : "Research coach failed."
      });
    }
  }

  async function loadArgument() {
    setArgumentState({
      loading: true,
      error: null
    });

    try {
      const result = await postAi<ArgumentResponse>("/api/ai/argument", {
        projectId
      });
      setArgument(result);
      setArgumentState(initialRequestState());
    } catch (error) {
      setArgumentState({
        loading: false,
        error: error instanceof Error ? error.message : "Argument architect failed."
      });
    }
  }

  async function loadAdversary() {
    setAdversaryState({
      loading: true,
      error: null
    });

    try {
      const result = await postAi<AdversaryResponse>("/api/ai/adversary", {
        projectId
      });
      setAdversary(result);
      setAdversaryState(initialRequestState());
    } catch (error) {
      setAdversaryState({
        loading: false,
        error: error instanceof Error ? error.message : "Adversarial mentor failed."
      });
    }
  }

  async function loadWriting() {
    setWritingState({
      loading: true,
      error: null
    });

    try {
      const result = await postAi<WritingResponse>("/api/ai/writing", {
        projectId,
        deliverableKey: "CORE_BUILD",
        currentDraft: coreBuildDraft
      });
      setWriting(result);
      setWritingState(initialRequestState());
    } catch (error) {
      setWritingState({
        loading: false,
        error: error instanceof Error ? error.message : "Writing coach failed."
      });
    }
  }

  async function loadQuality() {
    setQualityState({
      loading: true,
      error: null
    });

    try {
      const result = await postAi<QualityResponse>("/api/ai/quality", {
        projectId
      });
      setQuality(result);
      setQualityState(initialRequestState());
    } catch (error) {
      setQualityState({
        loading: false,
        error: error instanceof Error ? error.message : "Quality gate failed."
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateOrient() {
      try {
        const result = await postAi<OrientResponse>("/api/ai/orient", {
          projectId
        });

        if (!cancelled) {
          setOrient(result);
          setOrientState(initialRequestState());
        }
      } catch (error) {
        if (!cancelled) {
          setOrientState({
            loading: false,
            error: error instanceof Error ? error.message : "Orientation failed."
          });
        }
      }
    }

    async function hydrateTeamPulse() {
      if (collaboratorCount <= 0) {
        return;
      }

      try {
        const result = await postAi<TeamPulseResponse>("/api/ai/team-pulse", {
          projectId
        });

        if (!cancelled) {
          setTeamPulse(result);
          setTeamPulseState(initialRequestState());
        }
      } catch (error) {
        if (!cancelled) {
          setTeamPulseState({
            loading: false,
            error: error instanceof Error ? error.message : "Team pulse failed."
          });
        }
      }
    }

    void hydrateOrient();
    void hydrateTeamPulse();

    return () => {
      cancelled = true;
    };
  }, [collaboratorCount, milestoneKey, projectId]);

  return (
    <section className="rounded-[28px] border border-accent/20 bg-[linear-gradient(135deg,rgba(30,85,120,0.08),rgba(255,255,255,0.96),rgba(189,109,44,0.12))] p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">AI guidance layer</p>
          <h4 className="mt-3 font-display text-2xl text-ink">Stay oriented inside {prettyMilestoneLabel(milestoneKey)}</h4>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">
            This layer reads the saved project state and tells the student one clear next move. If you just changed a lot of text, give autosave a moment before running it again.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrient()}
          disabled={orientState.loading}
          className="rounded-full border border-accent bg-white/85 px-4 py-2 text-sm font-medium text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {orientState.loading ? "Checking..." : "Where am I?"}
        </button>
      </div>

      {orientState.error ? (
        <div className="mt-4 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm leading-6 text-warn">
          {orientState.error}
        </div>
      ) : null}

      {orient ? (
        <div className="mt-5 rounded-[24px] border border-line bg-white/82 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{orient.data.title}</p>
          <p className="mt-3 text-sm leading-6 text-ink/72">{orient.data.whereYouAre}</p>
          <p className="mt-3 text-sm leading-6 text-ink/68">{orient.data.whyItMatters}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-success/25 bg-success/10 px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-success">Done</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-success">
                {orient.data.done.length > 0 ? (
                  orient.data.done.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>The project is still taking shape.</li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-white/90 px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Still missing</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                {orient.data.notDone.length > 0 ? (
                  orient.data.notDone.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>No blockers are standing out right now.</li>
                )}
              </ul>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm leading-6 text-ink/72">
            <span className="font-medium text-ink">Next move:</span> {orient.data.nextMove}
          </div>
          <ResultMeta result={orient} />
        </div>
      ) : null}

      {milestoneKey === ProjectMilestoneKey.EVIDENCE_BOARD ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-[24px] border border-line bg-white/82 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Research engine</p>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  Ask what is confusing, then let the AI push the evidence board one question deeper.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadResearch()}
                disabled={researchState.loading}
                className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {researchState.loading ? "Thinking..." : "Run research coach"}
              </button>
            </div>
            <textarea
              value={researchPrompt}
              onChange={(event) => setResearchPrompt(event.target.value)}
              placeholder="Optional: tell the coach what feels fuzzy right now."
              className="mt-4 min-h-[110px] w-full rounded-[22px] border border-line bg-white/90 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
            {researchState.error ? (
              <p className="mt-3 text-sm leading-6 text-warn">{researchState.error}</p>
            ) : null}
            {research ? (
              <div className="mt-4 rounded-2xl border border-line bg-white/90 px-4 py-4">
                <p className="font-medium text-ink">{research.data.question}</p>
                <p className="mt-2 text-sm leading-6 text-ink/68">{research.data.coachingNote}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-line bg-white/90 px-4 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">What we know</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                      {research.data.researchLog.whatWeKnow.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/90 px-4 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Gaps</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                      {research.data.researchLog.gaps.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/90 px-4 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Next moves</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                      {research.data.researchLog.nextMoves.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>
                <ResultSources sources={research.sources} />
                <ResultMeta result={research} />
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[24px] border border-line bg-white/82 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Argument architect</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">
                    Turn the research log into one real claim, one ranked evidence trail, and one recommendation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadArgument()}
                  disabled={argumentState.loading}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {argumentState.loading ? "Building..." : "Build argument"}
                </button>
              </div>
              {argumentState.error ? (
                <p className="mt-3 text-sm leading-6 text-warn">{argumentState.error}</p>
              ) : null}
              {argument ? (
                <div className="mt-4 rounded-2xl border border-line bg-white/90 px-4 py-4">
                  <p className="font-medium text-ink">{argument.data.claim}</p>
                  <ol className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                    {argument.data.rankedEvidence.map((item) => <li key={item}>{item}</li>)}
                  </ol>
                  <p className="mt-4 text-sm leading-6 text-ink/68">
                    <span className="font-medium text-ink">Counterargument:</span> {argument.data.counterargument}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    <span className="font-medium text-ink">Rebuttal:</span> {argument.data.rebuttal}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    <span className="font-medium text-ink">Recommendation:</span> {argument.data.recommendation}
                  </p>
                  <p className="mt-3 rounded-2xl border border-accent/20 bg-accent/5 px-3 py-3 text-sm leading-6 text-ink/72">
                    {argument.data.coachingNote}
                  </p>
                  <ResultMeta result={argument} />
                </div>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-line bg-white/82 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Adversarial mentor</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">
                    Let the second pass attack the argument before the panel does it for real.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadAdversary()}
                  disabled={adversaryState.loading}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {adversaryState.loading ? "Testing..." : "Run adversary"}
                </button>
              </div>
              {adversaryState.error ? (
                <p className="mt-3 text-sm leading-6 text-warn">{adversaryState.error}</p>
              ) : null}
              {adversary ? (
                <div className="mt-4 rounded-2xl border border-line bg-white/90 px-4 py-4">
                  <p className={`font-medium ${adversary.data.passed ? "text-success" : "text-warn"}`}>
                    {adversary.data.passed ? "Passed the current challenge." : "Still vulnerable."}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-ink/68">
                    <span className="font-medium text-ink">Weakest evidence:</span> {adversary.data.weakestEvidence}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    <span className="font-medium text-ink">Who disagrees:</span> {adversary.data.disagreement}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    <span className="font-medium text-ink">Hardest question:</span> {adversary.data.hardestQuestion}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-ink/70">
                    {adversary.data.requiredFixes.map((item) => (
                      <li key={item} className="rounded-2xl border border-line bg-white/95 px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 rounded-2xl border border-accent/20 bg-accent/5 px-3 py-3 text-sm leading-6 text-ink/72">
                    {adversary.data.coachingNote}
                  </p>
                  <ResultSources sources={adversary.sources} />
                  <ResultMeta result={adversary} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {milestoneKey === ProjectMilestoneKey.BUILD_SPRINT ? (
        <div className="mt-6 rounded-[24px] border border-line bg-white/82 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Writing coach</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                Compare the current build draft against the saved revision trail and close the gap between your idea and your wording.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadWriting()}
              disabled={writingState.loading || coreBuildDraft.trim().length < 40}
              className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {writingState.loading ? "Reviewing..." : "Review current draft"}
            </button>
          </div>
          {coreBuildDraft.trim().length < 40 ? (
            <p className="mt-3 text-sm leading-6 text-ink/60">
              Add a little more core build writing before you ask for revision help.
            </p>
          ) : null}
          {writingState.error ? (
            <p className="mt-3 text-sm leading-6 text-warn">{writingState.error}</p>
          ) : null}
          {writing ? (
            <div className="mt-4 rounded-2xl border border-line bg-white/90 px-4 py-4">
              <p className="font-medium text-ink">{writing.data.overallAssessment}</p>
              <div className="mt-4 grid gap-3 xl:grid-cols-3">
                <div className="rounded-2xl border border-line bg-white/95 px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Strengths</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                    {writing.data.strengths.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-line bg-white/95 px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Revision priorities</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                    {writing.data.revisionPriorities.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-line bg-white/95 px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Line edits</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                    {writing.data.lineEdits.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
              <p className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 px-3 py-3 text-sm leading-6 text-ink/72">
                Compared to prior draft: {writing.data.comparedToPriorDraft}
              </p>
              <ResultMeta result={writing} />
            </div>
          ) : null}
        </div>
      ) : null}

      {milestoneKey === ProjectMilestoneKey.LAUNCH_WEEK ? (
        <div className="mt-6 rounded-[24px] border border-line bg-white/82 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Quality gate</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                This pass checks the full launch package against the project focus and blocks submission until the suite clears the bar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadQuality()}
              disabled={qualityState.loading}
              className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {qualityState.loading ? "Checking..." : "Run quality gate"}
            </button>
          </div>
          {qualityState.error ? (
            <p className="mt-3 text-sm leading-6 text-warn">{qualityState.error}</p>
          ) : null}
          {quality ? (
            <div className="mt-4 rounded-2xl border border-line bg-white/90 px-4 py-4">
              <p className={`font-medium ${quality.data.passed ? "text-success" : "text-warn"}`}>
                {quality.data.scoreLabel}
              </p>
              <div className="mt-4 space-y-3">
                {quality.data.rubricItems.map((item) => (
                  <div key={`${item.label}-${item.status}`} className="rounded-2xl border border-line bg-white/95 px-4 py-3">
                    <p className="text-sm font-medium text-ink">
                      {item.label} · {item.status}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{item.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <div className="rounded-2xl border border-line bg-white/95 px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Blockers</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                    {quality.data.blockers.length > 0 ? (
                      quality.data.blockers.map((item) => <li key={item}>{item}</li>)
                    ) : (
                      <li>No blockers are active right now.</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-2xl border border-line bg-white/95 px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Strengths</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
                    {quality.data.strengths.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
              <ResultMeta result={quality} />
            </div>
          ) : null}
        </div>
      ) : null}

      {collaboratorCount > 0 ? (
        <div className="mt-6 rounded-[24px] border border-line bg-white/82 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Team pulse</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                This prompt is for the team, not the teacher. It looks for uneven load, silence, or misalignment before the build gets messy.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadTeamPulse()}
              disabled={teamPulseState.loading}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {teamPulseState.loading ? "Checking..." : "Refresh team pulse"}
            </button>
          </div>
          {teamPulseState.error ? (
            <p className="mt-3 text-sm leading-6 text-warn">{teamPulseState.error}</p>
          ) : null}
          {teamPulse ? (
            <div className="mt-4 rounded-2xl border border-line bg-white/90 px-4 py-4">
              <p className={`font-medium ${teamPulse.data.status === "healthy" ? "text-success" : "text-warn"}`}>
                {teamPulse.data.status === "healthy" ? "Team alignment looks healthy." : "The team needs a reset."}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/68">{teamPulse.data.prompt}</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-ink/70">
                {teamPulse.data.findings.map((item) => (
                  <li key={item} className="rounded-2xl border border-line bg-white/95 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {teamPulse.data.contributions.map((item) => (
                  <div key={item.userId} className="rounded-2xl border border-line bg-white/95 px-4 py-3">
                    <p className="font-medium text-ink">{item.name}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">
                      {item.activityCount} signal(s) · {Math.round(item.share * 100)}% of the logged activity
                    </p>
                  </div>
                ))}
              </div>
              <ResultMeta result={teamPulse} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
