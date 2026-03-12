import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { canUserEditProjectDraft } from "@/server/project-access";

const rateLimitBuckets = new Map<string, number[]>();

function pruneTimestamps(timestamps: number[], now: number, windowMs: number) {
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

export function assertAiRateLimit(params: {
  userId: string;
  bucket: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const key = `${params.userId}:${params.bucket}`;
  const timestamps = pruneTimestamps(rateLimitBuckets.get(key) ?? [], now, params.windowMs);

  if (timestamps.length >= params.limit) {
    throw new Error("Too many AI requests in a short window. Please wait a minute and try again.");
  }

  timestamps.push(now);
  rateLimitBuckets.set(key, timestamps);
}

export function sanitizeAiText(value: string, maxLength = 6000) {
  return value.replace(/\u0000/g, "").trim().slice(0, maxLength);
}

export async function assertProjectAiAccess(params: {
  projectId: string;
  userId: string;
  role: UserRole;
}) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      collaborators: true
    }
  });

  if (!project || !canUserEditProjectDraft(project, params.userId, params.role)) {
    throw new Error("You do not have access to this project.");
  }

  return project;
}

export async function assertIssueAiAccess(params: {
  issueId: string;
  userId: string;
}) {
  const issue = await prisma.issue.findUnique({
    where: { id: params.issueId }
  });

  if (!issue) {
    throw new Error("Issue not found.");
  }

  return issue;
}
