import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth-options";
import { autosaveProposalDraft } from "@/server/autosave";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const result = await autosaveProposalDraft({
      formData,
      actorUserId: session.user.id
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autosave failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
