import { NextResponse } from "next/server";
import { z } from "zod";

import { aiJsonError, requireAiSession } from "@/server/ai/http";
import { assertIssueAiAccess } from "@/server/ai/security";
import { runIssueIntel } from "@/server/ai/service";

const requestSchema = z.object({
  issueId: z.string().min(1)
});

export async function POST(request: Request) {
  const user = await requireAiSession();

  if (!user) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const payload = requestSchema.parse(await request.json());
    await assertIssueAiAccess({
      issueId: payload.issueId,
      userId: user.id
    });

    const result = await runIssueIntel({
      userId: user.id,
      issueId: payload.issueId
    });

    return NextResponse.json(result);
  } catch (error) {
    return aiJsonError(error);
  }
}
