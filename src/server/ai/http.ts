import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/server/auth-options";

type AiSessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
};

export async function requireAiSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return null;
  }

  return {
    ...session.user,
    role: session.user.role
  } satisfies AiSessionUser;
}

export function aiJsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "AI request failed.";
  const lower = message.toLowerCase();
  const status =
    lower.includes("sign in") || lower.includes("unauthorized")
      ? 401
      : lower.includes("access")
        ? 403
        : lower.includes("not found")
          ? 404
          : lower.includes("too many")
            ? 429
            : 400;

  return NextResponse.json({ error: message }, { status });
}
