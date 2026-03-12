import { NextResponse } from "next/server";

import { aiJsonError, requireAiSession } from "@/server/ai/http";
import { runStudentMission } from "@/server/ai/service";

export async function GET() {
  const user = await requireAiSession();

  if (!user) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const result = await runStudentMission(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return aiJsonError(error);
  }
}
