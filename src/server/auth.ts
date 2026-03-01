import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/server/auth-options";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
};

export async function getViewer(): Promise<Viewer | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email || !session.user.name) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role ?? "STUDENT"
  };
}

export async function requireUser() {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/login");
  }

  return viewer;
}

export async function requireAdmin() {
  const viewer = await requireUser();

  if (viewer.role !== "ADMIN") {
    redirect("/");
  }

  return viewer;
}
