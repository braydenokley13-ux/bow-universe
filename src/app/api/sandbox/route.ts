import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { parseRuleDiff } from "@/lib/rules";
import { authOptions } from "@/server/auth-options";
import { buildSandboxReport } from "@/server/workflows";

const requestSchema = z.object({
  ruleSetId: z.string().min(1),
  diff: z.unknown()
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const payload = requestSchema.parse(await request.json());
    const report = await buildSandboxReport({
      targetRuleSetId: payload.ruleSetId,
      diff: parseRuleDiff(payload.diff)
    });

    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sandbox run failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
