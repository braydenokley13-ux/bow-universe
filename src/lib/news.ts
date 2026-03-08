export type NewsroomEditorialItem = {
  id: string;
  headline: string;
  dek: string;
  publishedAt: Date;
  slug: string;
  pinned: boolean;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  author?: { name: string } | null;
};

export type NewsroomAutoItem = {
  id: string;
  title: string;
  summary: string;
  createdAt: Date;
  entityType?: string | null;
  entityId?: string | null;
};

export type NewsroomFeedItem =
  | {
      id: string;
      kind: "editorial";
      headline: string;
      dek: string;
      publishedAt: Date;
      pinned: boolean;
      slug: string;
      href: string;
      authorName: string | null;
    }
  | {
      id: string;
      kind: "auto";
      headline: string;
      dek: string;
      publishedAt: Date;
      pinned: false;
      slug: null;
      href: string;
      authorName: null;
    };

export function newsEventHref(entityType: string | null | undefined, entityId: string | null | undefined) {
  if (!entityType || !entityId) {
    return "/news";
  }

  if (entityType === "Proposal" || entityType === "CommissionerDecision") {
    return `/proposals/${entityId}`;
  }

  if (entityType === "Project") {
    return `/projects/${entityId}`;
  }

  if (entityType === "Issue") {
    return `/issues/${entityId}`;
  }

  if (entityType === "Team") {
    return `/teams/${entityId}`;
  }

  return "/news";
}

export function buildNewsroomFeed(input: {
  editorials: NewsroomEditorialItem[];
  autoEvents: NewsroomAutoItem[];
}) {
  const editorialItems: NewsroomFeedItem[] = input.editorials.map((post) => ({
    id: post.id,
    kind: "editorial",
    headline: post.headline,
    dek: post.dek,
    publishedAt: post.publishedAt,
    pinned: post.pinned,
    slug: post.slug,
    href: `/news#${post.slug}`,
    authorName: post.author?.name ?? null
  }));

  const autoItems: NewsroomFeedItem[] = input.autoEvents.map((event) => ({
    id: event.id,
    kind: "auto",
    headline: event.title,
    dek: event.summary,
    publishedAt: event.createdAt,
    pinned: false,
    slug: null,
    href: newsEventHref(event.entityType, event.entityId),
    authorName: null
  }));

  return [...editorialItems, ...autoItems].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return right.publishedAt.getTime() - left.publishedAt.getTime();
  });
}
