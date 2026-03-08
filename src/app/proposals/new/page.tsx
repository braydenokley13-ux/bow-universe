import Link from "next/link";

import { Badge } from "@/components/badge";
import { ProposalForm } from "@/components/proposal-form";
import { SectionHeading } from "@/components/section-heading";
import { parseProposalStudioPrefill } from "@/lib/studio-entry";
import { createProposalAction } from "@/server/actions";
import { getViewer } from "@/server/auth";
import { getProposalCreateData } from "@/server/data";

export default async function NewProposalPage({
  searchParams
}: {
  searchParams?: Promise<{ issueId?: string }>;
}) {
  const viewer = await getViewer();
  const { issues, ruleSets } = await getProposalCreateData();
  const resolvedSearchParams = (await searchParams) ?? {};
  const prefill = parseProposalStudioPrefill(resolvedSearchParams);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Proposal Coach"
        title="Adaptive policy memo wizard"
        description="This studio now guides students one small decision at a time. It helps them connect a live issue to the active RuleSet, build a real rule diff, test it in the sandbox, and only submit once the memo is truly review-ready."
      />

      {viewer ? (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <Badge tone="success">Memo studio</Badge>
          </div>
          <ProposalForm
            issues={issues}
            ruleSets={ruleSets}
            action={createProposalAction}
            intentLabel="Submit for review"
            initial={{
              title: "",
              issueId: prefill.issueId,
              ruleSetId: ruleSets[0]?.id ?? "",
              abstract: "",
              methodsSummary: "",
              problem: "",
              currentRuleContext: "",
              proposedChange: "",
              impactAnalysis: "",
              tradeoffs: "",
              sandboxInterpretation: "",
              recommendation: "",
              diffJson: "",
              referencesText: "",
              keywordsText: "",
              keyTakeawaysText: "",
              publicationSlug: "",
              sandboxResult: null
            }}
          />
        </div>
      ) : (
        <div className="panel p-6">
          <p className="text-sm leading-6 text-ink/68">
            Sign in to draft a proposal. You can use the seeded student or commissioner account from the login page.
          </p>
          <div className="mt-4">
            <Link href="/login" className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white">
              Go to sign in
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
