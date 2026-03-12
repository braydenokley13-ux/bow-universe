import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectMilestoneKey } from "@prisma/client";

import { aiJsonError, requireAiSession } from "@/server/ai/http";
import { assertProjectAiAccess } from "@/server/ai/security";
import { runProjectNarrative } from "@/server/ai/service";

const requestSchema = z.object({
  projectId: z.string().min(1),
  milestoneKey: z.nativeEnum(ProjectMilestoneKey)
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

    const result = await runProjectNarrative({
      userId: user.id,
      projectId: payload.projectId,
      milestoneKey: payload.milestoneKey
    });

    return NextResponse.json(result);
  } catch (error) {
    return aiJsonError(error);
  }
}
