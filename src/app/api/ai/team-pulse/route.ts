import { NextResponse } from "next/server";
import { z } from "zod";

import { aiJsonError, requireAiSession } from "@/server/ai/http";
import { assertProjectAiAccess } from "@/server/ai/security";
import { runProjectTeamPulse } from "@/server/ai/service";

const requestSchema = z.object({
  projectId: z.string().min(1)
});

export async function POST(request: Request) {
  const user = await requireAiSession();

  if (!user) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const payload = requestSchema.parse(await request.json());
    await assertProjectAiAccess({
      projectId: payload.projectId,
      userId: user.id,
      role: user.role
    });

    const result = await runProjectTeamPulse({
      userId: user.id,
      projectId: payload.projectId
    });

    return NextResponse.json(result);
  } catch (error) {
    return aiJsonError(error);
  }
}
