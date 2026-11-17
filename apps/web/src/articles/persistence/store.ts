import { translationLocaleSchema, visibilitySchema } from "@my-knowledge/content";
import { z } from "zod";

const INDEX_KEY = "knowledge/index.json";
const ATTEMPTS = 5;

export const articleRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  contentHash: z.string(),
  tagsJson: z.string(),
  visibility: visibilitySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const articleTranslationRowSchema = z.object({
  articleId: z.string(),
  locale: translationLocaleSchema,
  title: z.string(),
  summary: z.string(),
  sourceHash: z.string(),
});

const indexSchema = z.object({
  articles: z.array(articleRowSchema),
  translations: z.array(articleTranslationRowSchema),
});

export type ArticleRow = z.infer<typeof articleRowSchema>;
export type ArticleTranslationRow = z.infer<typeof articleTranslationRowSchema>;
type ArticleIndex = z.infer<typeof indexSchema>;

async function load(bucket: R2Bucket) {
  const object = await bucket.get(INDEX_KEY);
  if (!object) return { index: { articles: [], translations: [] }, etag: null };
  return { index: indexSchema.parse(await object.json()), etag: object.etag };
}

export async function readIndex(env: CloudflareEnv): Promise<ArticleIndex> {
  return (await load(env.KNOWLEDGE_BUCKET)).index;
}

async function change<T>(
  env: CloudflareEnv,
  edit: (index: ArticleIndex) => { index: ArticleIndex; result: T } | null,
): Promise<T | undefined> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const { index, etag } = await load(env.KNOWLEDGE_BUCKET);
    const edited = edit(index);
    if (!edited) return undefined;
    const written = await env.KNOWLEDGE_BUCKET.put(INDEX_KEY, JSON.stringify(edited.index), {
      httpMetadata: { contentType: "application/json" },
      onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: "*" },
    });
    if (written) return edited.result;
  }
  throw new Error("The article index kept changing while saving.");
}

type Expected = { contentHash: string; updatedAt: string };

const matches = (row: ArticleRow, id: string, expected: Expected) =>
  row.id === id && row.contentHash === expected.contentHash && row.updatedAt === expected.updatedAt;

export const findArticle = async (env: CloudflareEnv, id: string) =>
  (await readIndex(env)).articles.find((row) => row.id === id);

export const insertArticle = (env: CloudflareEnv, row: ArticleRow) =>
  change(env, (index) =>
    index.articles.some((existing) => existing.id === row.id)
      ? null
      : { index: { ...index, articles: [...index.articles, row] }, result: row },
  );

export const updateArticleIf = (
  env: CloudflareEnv,
  id: string,
  expected: Expected,
  values: Partial<ArticleRow>,
) =>
  change(env, (index) => {
    const row = index.articles.find((candidate) => matches(candidate, id, expected));
    if (!row) return null;
    const updated = { ...row, ...values };
    return {
      index: {
        ...index,
        articles: index.articles.map((candidate) => (candidate.id === id ? updated : candidate)),
      },
      result: updated,
    };
  });

export const deleteArticleIf = (env: CloudflareEnv, id: string, expected: Expected) =>
  change(env, (index) =>
    index.articles.some((row) => matches(row, id, expected))
      ? {
          index: {
            articles: index.articles.filter((row) => row.id !== id),
            translations: index.translations.filter((row) => row.articleId !== id),
          },
          result: true,
        }
      : null,
  );

export const listTranslations = async (env: CloudflareEnv, locale: string) =>
  (await readIndex(env)).translations.filter((row) => row.locale === locale);

export const findTranslations = async (env: CloudflareEnv, id: string) =>
  (await readIndex(env)).translations.filter((row) => row.articleId === id);

export const saveTranslation = (
  env: CloudflareEnv,
  translation: ArticleTranslationRow,
  article: { expected: Expected; values: Partial<ArticleRow> } | null,
) =>
  change(env, (index) => {
    const translations = [
      ...index.translations.filter(
        (row) => !(row.articleId === translation.articleId && row.locale === translation.locale),
      ),
      translation,
    ];
    if (!article) return { index: { ...index, translations }, result: null };
    const row = index.articles.find((candidate) =>
      matches(candidate, translation.articleId, article.expected),
    );
    if (!row) return null;
    const updated = { ...row, ...article.values };
    return {
      index: {
        translations,
        articles: index.articles.map((candidate) =>
          candidate.id === updated.id ? updated : candidate,
        ),
      },
      result: updated,
    };
  });
