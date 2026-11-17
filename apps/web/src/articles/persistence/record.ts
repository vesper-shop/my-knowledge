import { type ArticleSummary, normalizeLocale, visibilitySchema } from "@my-knowledge/content";
import { z } from "zod";

import type { ArticleRow, ArticleTranslationRow } from "./store";

export type { ArticleRow, ArticleTranslationRow };

const stringArraySchema = z.array(z.string());

export function articleObjectKey(articleId: string, locale: string): string {
  const normalized = normalizeLocale(locale);
  return normalized === "zh"
    ? `knowledge/${articleId}/zh.md`
    : `knowledge/${articleId}/i18n/${normalized}.md`;
}

export function articleSummary(
  row: ArticleRow,
  translations: readonly ArticleTranslationRow[] = [],
): ArticleSummary {
  const parsedTags: unknown = JSON.parse(row.tagsJson);
  const editions = Object.fromEntries(
    translations
      .filter((translation) => translation.sourceHash === row.contentHash)
      .map((translation) => [
        translation.locale,
        { title: translation.title, summary: translation.summary },
      ]),
  );
  return {
    id: row.id,
    editions: { ...editions, zh: { title: row.title, summary: row.summary } },
    tags: stringArraySchema.parse(parsedTags),
    visibility: visibilitySchema.parse(row.visibility),
    contentHash: row.contentHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
