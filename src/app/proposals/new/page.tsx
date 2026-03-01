import Link from "next/link";

import { Badge } from "@/components/badge";
import { ProposalForm } from "@/components/proposal-form";
import { SectionHeading } from "@/components/section-heading";
import { createProposalAction } from "@/server/actions";
import { getViewer } from "@/server/auth";
import { getProposalCreateData } from "@/server/data";

export default async function NewProposalPage() {
  const viewer = await getViewer();
  const { issues, ruleSets } = await getProposalCreateData();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="New Proposal"
        title="Guided reform form"
        description="This route now saves real proposal records. Students can connect a problem to an issue, choose the active ruleset, and store a structured rule diff."
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
