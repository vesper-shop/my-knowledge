import { describe, expect, it } from "vite-plus/test";

import { authorized, countTags } from "@/articles/persistence/query";

const row = (id: string, tags: string[], visibility: "public" | "private") => ({
  id,
  title: id,
  summary: "",
  contentHash: id,
  tagsJson: JSON.stringify(tags),
  visibility,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const rows = [
  row("public-one", ["engineering/architecture", "engineering/testing/privacy"], "public"),
  row("public-two", ["engineering/architecture"], "public"),
  row("private-one", ["private/security"], "private"),
];

describe("article tag counts", () => {
  it("counts each article once for every hierarchical tag path", () => {
    expect(countTags(rows.filter(authorized("anonymous")))).toEqual([
      { path: "engineering", count: 2 },
      { path: "engineering/architecture", count: 2 },
      { path: "engineering/testing", count: 1 },
      { path: "engineering/testing/privacy", count: 1 },
    ]);
    expect(countTags(rows.filter(authorized("owner")))).toContainEqual({
      path: "private",
      count: 1,
    });
  });
});
