export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
};

export async function getViewer(): Promise<Viewer | null> {
  return null;
}

export async function requireUser() {
  throw new Error("Authentication is not implemented yet.");
}

export async function requireAdmin() {
  throw new Error("Admin authentication is not implemented yet.");
}
