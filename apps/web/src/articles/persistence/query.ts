import { canonicalizeTags, type ArticleSummary } from "@my-knowledge/content";
import { z } from "zod";

import type { ArticleListQuery, ArticlePage, TagCount } from "../types";
import type { Principal } from "@/auth/types";

import { articleSummary, type ArticleRow } from "./record";
import { readIndex } from "./store";

const cursorSchema = z.object({ createdAt: z.string(), id: z.string() });

function encodeCursor(row: ArticleRow): string {
  return btoa(JSON.stringify({ createdAt: row.createdAt, id: row.id }));
}

function decodeCursor(cursor: string) {
  const parsed: unknown = JSON.parse(atob(cursor));
  return cursorSchema.parse(parsed);
}

const tagsOf = (row: ArticleRow) =>
  z
    .array(z.string())
    .parse(JSON.parse(row.tagsJson))
    .map((tag) => tag.toLocaleLowerCase("en-US"));

const hasTag = (row: ArticleRow, tag: string) =>
  tagsOf(row).some((name) => name === tag || name.startsWith(`${tag}/`));

const discoverable = (row: ArticleRow) => !hasTag(row, "daily");

export const authorized = (principal: Principal) => (row: ArticleRow) =>
  principal !== "anonymous" || row.visibility === "public";

const newestFirst = (a: ArticleRow, b: ArticleRow) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

export async function listArticles(
  env: CloudflareEnv,
  principal: Principal,
  input: ArticleListQuery,
): Promise<ArticlePage> {
  if (principal === "anonymous" && input.visibility === "private")
    return { articles: [], nextCursor: null };
  const tags = canonicalizeTags(input.tags).map((tag) => tag.toLocaleLowerCase("en-US"));
  const cursor = input.cursor ? decodeCursor(input.cursor) : null;
  const rows = (await readIndex(env)).articles
    .filter(authorized(principal))
    .filter((row) => tags.length > 0 || discoverable(row))
    .filter((row) => !input.visibility || row.visibility === input.visibility)
    .filter((row) => tags.every((tag) => hasTag(row, tag)))
    .filter(
      (row) =>
        !cursor ||
        row.createdAt < cursor.createdAt ||
        (row.createdAt === cursor.createdAt && row.id < cursor.id),
    )
    .sort(newestFirst);
  const pageRows = rows.slice(0, input.limit);
  const next = rows.length > input.limit ? pageRows.at(-1) : undefined;
  return {
    articles: pageRows.map((row) => articleSummary(row)),
    nextCursor: next ? encodeCursor(next) : null,
  };
}

export async function listPublicArticleSummaries(env: CloudflareEnv): Promise<ArticleSummary[]> {
  return (await readIndex(env)).articles
    .filter((row) => row.visibility === "public" && discoverable(row))
    .sort(newestFirst)
    .map((row) => articleSummary(row));
}

export async function searchArticles(
  env: CloudflareEnv,
  principal: Principal,
  query: string,
  limit: number,
): Promise<ArticleSummary[]> {
  const term = query.trim().toLocaleLowerCase("en-US");
  return (await readIndex(env)).articles
    .filter(authorized(principal))
    .filter(discoverable)
    .filter(
      (row) =>
        row.title.toLocaleLowerCase("en-US").includes(term) ||
        row.summary.toLocaleLowerCase("en-US").includes(term) ||
        tagsOf(row).some((tag) => tag.includes(term)),
    )
    .sort(newestFirst)
    .slice(0, limit)
    .map((row) => articleSummary(row));
}

export function countTags(rows: ArticleRow[]): TagCount[] {
  const uses = rows.flatMap((row) =>
    tagsOf(row).flatMap((tag) =>
      tag.split("/").map((_, depth, parts) => ({
        path: parts.slice(0, depth + 1).join("/"),
        id: row.id,
      })),
    ),
  );
  return [...Map.groupBy(uses, (use) => use.path)]
    .map(([path, tagged]) => ({ path, count: new Set(tagged.map((use) => use.id)).size }))
    .sort((a, b) => (a.path < b.path ? -1 : 1));
}

export async function listTags(env: CloudflareEnv, principal: Principal): Promise<TagCount[]> {
  return countTags((await readIndex(env)).articles.filter(authorized(principal)));
}
