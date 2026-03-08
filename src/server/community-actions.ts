"use server";

import { randomBytes } from "node:crypto";

import { hash } from "bcryptjs";
import {
  ChallengeEntryType,
  LaneTag,
  Prisma,
  ProposalStatus,
  PublicationSourceType,
  SubmissionStatus,
  UserRole
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { requireAdmin, requireUser } from "@/server/auth";
import {
  challengeIsOpen,
  syncChallengeMilestonesForSource
} from "@/server/challenges";
import { createActivityEvent } from "@/server/workflows";

const classCodeSchema = z.object({
  label: z.string().trim().min(3).max(80),
  description: z.string().trim().max(240).optional().nullable(),
  linkedTeamId: z.string().trim().optional().nullable(),
  expiresAt: z.string().trim().optional().nullable()
});

const signupSchema = z
  .object({
    classCode: z.string().trim().min(4),
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
  });

const newsPostSchema = z.object({
  headline: z.string().trim().min(5).max(120),
  dek: z.string().trim().min(12).max(220),
  bodyMd: z.string().trim().min(20),
  linkedEntityType: z.string().trim().optional().nullable(),
  linkedEntityId: z.string().trim().optional().nullable(),
  pinned: z.boolean().optional().default(false)
});

const challengeSchema = z
  .object({
    title: z.string().trim().min(5).max(120),
    summary: z.string().trim().min(12).max(220),
    prompt: z.string().trim().min(20),
    scoringNotesMd: z.string().trim().optional().nullable(),
    laneTag: z.string().trim().optional().nullable(),
    issueId: z.string().trim().optional().nullable(),
    teamId: z.string().trim().optional().nullable(),
    allowedEntryType: z.nativeEnum(ChallengeEntryType),
    startsAt: z.string().trim().min(4),
    endsAt: z.string().trim().min(4)
  })
  .refine((input) => new Date(input.endsAt).getTime() > new Date(input.startsAt).getTime(), {
    message: "Challenge end time must be after the start time.",
    path: ["endsAt"]
  });

const joinChallengeSchema = z.object({
  challengeId: z.string().trim().min(1),
  sourceType: z.nativeEnum(PublicationSourceType),
  sourceId: z.string().trim().min(1)
});

const spotlightChallengeSchema = z.object({
  challengeEntryId: z.string().trim().min(1),
  note: z.string().trim().max(220).optional().nullable()
});

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function buildGeneratedSlug(value: string) {
  return `${slugify(value)}-${randomBytes(2).toString("hex")}`;
}

function buildClassCode(label: string) {
  const base = slugify(label).replace(/-/g, "").slice(0, 8).toUpperCase() || "BOW";
  return `${base}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function parseOptionalDateValue(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return null;
  }

  return new Date(value);
}

function redirectToSignup(status: string, code?: string | null): never {
  const params = new URLSearchParams({ status });
  if (code) {
    params.set("code", code);
  }

  redirect(`/signup?${params.toString()}`);
}

export async function createClassCodeAction(formData: FormData) {
  const viewer = await requireAdmin();
  const parsed = classCodeSchema.safeParse({
    label: formData.get("label"),
    description: formData.get("description"),
    linkedTeamId: formData.get("linkedTeamId"),
    expiresAt: formData.get("expiresAt")
  });

  if (!parsed.success) {
    return;
  }

  const linkedTeamId = parsed.data.linkedTeamId || null;
  if (linkedTeamId) {
    const team = await prisma.team.findUnique({
      where: { id: linkedTeamId },
      select: { id: true }
    });

    if (!team) {
      return;
    }
  }

  const classCode = await prisma.classCode.create({
    data: {
      code: buildClassCode(parsed.data.label),
      label: parsed.data.label,
      description: parsed.data.description || null,
      commissionerId: viewer.id,
      linkedTeamId,
      expiresAt: parseOptionalDateValue(parsed.data.expiresAt)
    }
  });

  await createActivityEvent(prisma, {
    type: "class-code",
    title: `Created class code ${classCode.code}`,
    summary: `${viewer.name} created a self-signup class code${linkedTeamId ? " linked to a team." : "."}`,
    entityType: "ClassCode",
    entityId: classCode.id,
    createdByUserId: viewer.id,
    metadata: {
      code: classCode.code,
      linkedTeamId
    }
  });

  revalidatePath("/admin");
}

export async function signUpWithClassCodeAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    classCode: formData.get("classCode"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  const classCodeInput = String(formData.get("classCode") ?? "").trim().toUpperCase();

  if (!parsed.success) {
    redirectToSignup("invalid", classCodeInput);
  }

  const email = parsed.data.email.toLowerCase();
  const classCode = await prisma.classCode.findUnique({
    where: { code: classCodeInput },
    include: {
      commissioner: true
    }
  });

  if (!classCode || !classCode.active) {
    redirectToSignup("code-missing", classCodeInput);
  }

  if (classCode.expiresAt && classCode.expiresAt.getTime() < Date.now()) {
    redirectToSignup("code-expired", classCode.code);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser) {
    redirectToSignup("email-taken", classCode.code);
  }

  const passwordHash = await hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: UserRole.STUDENT,
      commissionerId: classCode.commissionerId,
      linkedTeamId: classCode.linkedTeamId,
      signedUpViaClassCodeId: classCode.id
    }
  });

  await createActivityEvent(prisma, {
    type: "user",
    title: `Signed up with class code: ${user.name}`,
    summary: `${user.name} created a student account with the ${classCode.code} class code.`,
    entityType: "User",
    entityId: user.id,
    createdByUserId: user.id,
    metadata: asJson({
      classCodeId: classCode.id,
      commissionerId: classCode.commissionerId
    })
  });

  revalidatePath("/admin");
  revalidatePath("/login");
  redirect(`/login?email=${encodeURIComponent(user.email)}&signedUp=1`);
}

export async function createNewsPostAction(formData: FormData) {
  const viewer = await requireAdmin();
  const parsed = newsPostSchema.safeParse({
    headline: formData.get("headline"),
    dek: formData.get("dek"),
    bodyMd: formData.get("bodyMd"),
    linkedEntityType: formData.get("linkedEntityType"),
    linkedEntityId: formData.get("linkedEntityId"),
    pinned: formData.get("pinned") === "on"
  });

  if (!parsed.success) {
    return;
  }

  const post = await prisma.newsPost.create({
    data: {
      slug: buildGeneratedSlug(parsed.data.headline),
      headline: parsed.data.headline,
      dek: parsed.data.dek,
      bodyMd: parsed.data.bodyMd,
      linkedEntityType: parsed.data.linkedEntityType || null,
      linkedEntityId: parsed.data.linkedEntityId || null,
      pinned: parsed.data.pinned,
      authorUserId: viewer.id
    }
  });

  await createActivityEvent(prisma, {
    type: "news",
    title: `Published newsroom post: ${post.headline}`,
    summary: `${viewer.name} published a commissioner newsroom update.`,
    entityType: "NewsPost",
    entityId: post.id,
    createdByUserId: viewer.id
  });

  revalidatePath("/admin");
  revalidatePath("/news");
  revalidatePath("/");
}

export async function createChallengeAction(formData: FormData) {
  const viewer = await requireAdmin();
  const parsed = challengeSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    prompt: formData.get("prompt"),
    scoringNotesMd: formData.get("scoringNotesMd"),
    laneTag: formData.get("laneTag"),
    issueId: formData.get("issueId"),
    teamId: formData.get("teamId"),
    allowedEntryType: formData.get("allowedEntryType"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt")
  });

  if (!parsed.success) {
    return;
  }

  const challenge = await prisma.challenge.create({
    data: {
      slug: buildGeneratedSlug(parsed.data.title),
      title: parsed.data.title,
      summary: parsed.data.summary,
      prompt: parsed.data.prompt,
      scoringNotesMd: parsed.data.scoringNotesMd || null,
      laneTag: (parsed.data.laneTag || null) as LaneTag | null,
      issueId: parsed.data.issueId || null,
      teamId: parsed.data.teamId || null,
      allowedEntryType: parsed.data.allowedEntryType,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      createdByUserId: viewer.id
    }
  });

  await createActivityEvent(prisma, {
    type: "challenge",
    title: `Created challenge: ${challenge.title}`,
    summary: `${viewer.name} opened a new research challenge for students.`,
    entityType: "Challenge",
    entityId: challenge.id,
    createdByUserId: viewer.id
  });

  revalidatePath("/admin");
  revalidatePath("/challenges");
  revalidatePath("/");
}

export async function joinChallengeAction(formData: FormData) {
  const viewer = await requireUser();
  const parsed = joinChallengeSchema.safeParse({
    challengeId: formData.get("challengeId"),
    sourceType: formData.get("sourceType"),
    sourceId: formData.get("sourceId")
  });

  if (!parsed.success) {
    return;
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: parsed.data.challengeId }
  });

  if (!challenge || !challengeIsOpen(challenge)) {
    return;
  }

  if (
    challenge.allowedEntryType !== ChallengeEntryType.EITHER &&
    challenge.allowedEntryType !== parsed.data.sourceType
  ) {
    return;
  }

  let sourceStatus: SubmissionStatus | ProposalStatus;

  if (parsed.data.sourceType === PublicationSourceType.PROJECT) {
    const sourceRecord = await prisma.project.findUnique({
      where: { id: parsed.data.sourceId },
      select: {
        id: true,
        createdByUserId: true,
        submissionStatus: true
      }
    });

    if (!sourceRecord || sourceRecord.createdByUserId !== viewer.id) {
      return;
    }

    sourceStatus = sourceRecord.submissionStatus;
  } else {
    const sourceRecord = await prisma.proposal.findUnique({
      where: { id: parsed.data.sourceId },
      select: {
        id: true,
        createdByUserId: true,
        status: true
      }
    });

    if (!sourceRecord || sourceRecord.createdByUserId !== viewer.id) {
      return;
    }

    sourceStatus = sourceRecord.status;
  }

  const entry = await prisma.challengeEntry.upsert({
    where: {
      challengeId_userId: {
        challengeId: challenge.id,
        userId: viewer.id
      }
    },
    update: {
      sourceType: parsed.data.sourceType,
      sourceId: parsed.data.sourceId,
      scoreEvents: {
        deleteMany: {}
      }
    },
    create: {
      challengeId: challenge.id,
      userId: viewer.id,
      sourceType: parsed.data.sourceType,
      sourceId: parsed.data.sourceId
    }
  });

  await syncChallengeMilestonesForSource({
    sourceType: parsed.data.sourceType,
    sourceId: parsed.data.sourceId,
    status: sourceStatus,
    actorUserId: viewer.id
  });

  await createActivityEvent(prisma, {
    type: "challenge",
    title: `${viewer.name} joined ${challenge.title}`,
    summary: `${viewer.name} entered work into a student research challenge.`,
    entityType: "Challenge",
    entityId: challenge.id,
    createdByUserId: viewer.id,
    metadata: {
      challengeEntryId: entry.id,
      sourceType: parsed.data.sourceType,
      sourceId: parsed.data.sourceId
    }
  });

  revalidatePath("/challenges");
  revalidatePath(`/challenges/${challenge.id}`);
  revalidatePath("/");
  revalidatePath("/students/me");
}

export async function spotlightChallengeEntryAction(formData: FormData) {
  const viewer = await requireAdmin();
  const parsed = spotlightChallengeSchema.safeParse({
    challengeEntryId: formData.get("challengeEntryId"),
    note: formData.get("note")
  });

  if (!parsed.success) {
    return;
  }

  const entry = await prisma.challengeEntry.findUnique({
    where: { id: parsed.data.challengeEntryId },
    include: {
      challenge: true,
      scoreEvents: true,
      user: true
    }
  });

  if (!entry) {
    return;
  }

  const hasSpotlight = entry.scoreEvents.some((event) => event.kind === "SPOTLIGHT");
  if (!hasSpotlight) {
    await prisma.challengeScoreEvent.create({
      data: {
        challengeEntryId: entry.id,
        kind: "SPOTLIGHT",
        points: 10,
        note: parsed.data.note || "Commissioner spotlight bonus",
        createdByUserId: viewer.id
      }
    });
  }

  await prisma.challengeEntry.update({
    where: { id: entry.id },
    data: {
      spotlightedAt: entry.spotlightedAt ?? new Date()
    }
  });

  await createActivityEvent(prisma, {
    type: "challenge",
    title: `Spotlighted challenge entry by ${entry.user.name}`,
    summary: `${viewer.name} spotlighted a student challenge entry.`,
    entityType: "Challenge",
    entityId: entry.challengeId,
    createdByUserId: viewer.id
  });

  revalidatePath(`/challenges/${entry.challengeId}`);
  revalidatePath("/challenges");
  revalidatePath("/students/me");
}
