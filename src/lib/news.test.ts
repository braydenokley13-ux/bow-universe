import { describe, expect, it } from "vitest";

import { buildNewsroomFeed, newsEventHref } from "@/lib/news";

describe("news helpers", () => {
  it("sorts pinned editorial items ahead of auto events", () => {
    const feed = buildNewsroomFeed({
      editorials: [
        {
          id: "post-1",
          slug: "big-story",
          headline: "Big story",
          dek: "Pinned editorial",
          pinned: true,
          publishedAt: new Date("2028-01-03T12:00:00Z"),
          author: { name: "Commissioner Avery" }
        }
      ],
      autoEvents: [
        {
          id: "event-1",
          title: "Season advanced",
          summary: "The season rolled forward.",
          createdAt: new Date("2028-01-04T12:00:00Z"),
          entityType: "Season",
          entityId: "season-2028"
        }
      ]
    });

    expect(feed[0]?.kind).toBe("editorial");
    expect(feed[1]?.kind).toBe("auto");
  });

  it("maps entity types to destination urls", () => {
    expect(newsEventHref("Issue", "issue-1")).toBe("/issues/issue-1");
    expect(newsEventHref("Team", "team-1")).toBe("/teams/team-1");
    expect(newsEventHref(null, null)).toBe("/news");
  });
});
