import { ProjectScale, UserRole } from "@prisma/client";

type ProjectEditorShape = {
  createdByUserId: string;
  scale: ProjectScale;
  collaborators?: Array<{ userId: string }>;
};

export function canUserEditProjectDraft(
  project: ProjectEditorShape,
  actorUserId: string,
  actorRole: UserRole
) {
  if (actorRole === UserRole.ADMIN) {
    return true;
  }

  if (project.createdByUserId === actorUserId) {
    return true;
  }

  if (project.scale !== ProjectScale.EXTENDED) {
    return false;
  }

  return (project.collaborators ?? []).some((collaborator) => collaborator.userId === actorUserId);
}
