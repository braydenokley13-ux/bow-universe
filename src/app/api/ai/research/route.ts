import { NextResponse } from "next/server";
import { z } from "zod";

import { runProjectResearch } from "@/server/ai/service";
import { requireAiSession, aiJsonError } from "@/server/ai/http";
import { assertProjectAiAccess } from "@/server/ai/security";

const requestSchema = z.object({
  projectId: z.string().min(1),
  userMessage: z.string().trim().max(2000).optional().nullable()
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

    const result = await runProjectResearch({
      userId: user.id,
      projectId: payload.projectId,
      userMessage: payload.userMessage ?? null
    });

    return NextResponse.json(result);
  } catch (error) {
    return aiJsonError(error);
  }
}
