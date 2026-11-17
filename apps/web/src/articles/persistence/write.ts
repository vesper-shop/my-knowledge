import type {
  ArticleDocumentSet,
  ArticleSummary,
  ParsedArticleDocument,
  TranslationLocale,
  Visibility,
} from "@my-knowledge/content";

import { deleteArticleCache } from "./cache";
import { readArticleRow } from "./document";
import { createStoredArticle, deleteStoredArticle, updateStoredArticle } from "./mutation";
import { articleObjectKey, articleSummary, type ArticleRow } from "./record";
import {
  deleteArticleIf,
  findTranslations,
  insertArticle,
  saveTranslation,
  updateArticleIf,
} from "./store";
import type { StoredArticleDocument, WrittenArticleDocument } from "./types";

function nextUpdatedAt(previous: string): string {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
}

const articleLocales: readonly string[] = ["zh", "en", "ja"];

async function readStoredDocument(
  bucket: R2Bucket,
  id: string,
  locale: string,
  contentHash: string,
): Promise<StoredArticleDocument | null> {
  const key = articleObjectKey(id, locale);
  const object = await bucket.get(key);
  if (!object) return null;
  if (object.customMetadata?.contentHash !== contentHash) {
    throw new Error(`Article version changed while reading ${id}/${locale}`);
  }
  return {
    contentHash,
    key,
    markdown: await object.text(),
    etag: object.etag,
  };
}

async function writeDocument(
  bucket: R2Bucket,
  key: string,
  markdown: string,
  contentHash: string,
  previous: StoredArticleDocument | null,
): Promise<WrittenArticleDocument> {
  const object = await bucket.put(key, markdown, {
    onlyIf: previous ? { etagMatches: previous.etag } : { etagDoesNotMatch: "*" },
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
    customMetadata: { contentHash },
  });
  if (!object) throw new Error(`Markdown changed while writing ${key}`);
  return { key, etag: object.etag };
}

async function rollbackDocument(
  bucket: R2Bucket,
  previous: StoredArticleDocument | null,
  written: WrittenArticleDocument,
): Promise<void> {
  const current = await bucket.head(written.key);
  if (!current || current.etag !== written.etag) {
    throw new Error(`Cannot roll back changed Markdown object ${written.key}`);
  }
  if (!previous) {
    await bucket.delete(written.key);
    return;
  }
  const restored = await bucket.put(written.key, previous.markdown, {
    onlyIf: { etagMatches: written.etag },
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
    customMetadata: { contentHash: previous.contentHash },
  });
  if (!restored) throw new Error(`Cannot restore Markdown object ${written.key}`);
}

async function deleteStoredDocuments(
  bucket: R2Bucket,
  documents: readonly StoredArticleDocument[],
): Promise<void> {
  for (const document of documents) {
    const current = await bucket.head(document.key);
    if (!current) continue;
    if (current.etag !== document.etag) {
      throw new Error(`Canonical Markdown changed before deleting ${document.key}`);
    }
    await bucket.delete(document.key);
  }
}

export async function createArticle(
  env: CloudflareEnv,
  id: string,
  document: ArticleDocumentSet,
): Promise<ArticleRow> {
  const existing = await readArticleRow(env, "owner", id);
  if (existing) return existing;
  const chinese = document.editions.zh;
  const timestamp = new Date().toISOString();
  let written: WrittenArticleDocument | null = null;
  await createStoredArticle({
    writeDocuments: async () => {
      written = await writeDocument(
        env.KNOWLEDGE_BUCKET,
        articleObjectKey(id, "zh"),
        chinese.markdown,
        document.contentHash,
        null,
      );
    },
    insertRow: async () => {
      const inserted = await insertArticle(env, {
        id,
        title: chinese.title,
        summary: chinese.summary,
        contentHash: document.contentHash,
        tagsJson: JSON.stringify(document.tags),
        visibility: "public",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      if (!inserted) throw new Error(`Article ${id} already exists`);
      return id;
    },
    cleanupNewVersion: async () => {
      if (!written || (await readArticleRow(env, "owner", id))) return;
      await rollbackDocument(env.KNOWLEDGE_BUCKET, null, written);
      await deleteArticleCache(env.KNOWLEDGE_CACHE, id, document.contentHash, articleLocales);
    },
  });
  const stored = await readArticleRow(env, "owner", id);
  if (!stored) throw new Error(`Created article ${id} is not readable`);
  return stored;
}

export async function updateArticle(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  document: ArticleDocumentSet,
  visibility?: Visibility,
): Promise<ArticleRow | undefined> {
  const previous = await readArticleRow(env, "owner", id);
  if (!previous || previous.contentHash !== expectedHash) return undefined;
  if (document.contentHash === expectedHash) {
    return updateArticleIf(env, id, previous, {
      updatedAt: nextUpdatedAt(previous.updatedAt),
      ...(visibility === undefined ? {} : { visibility }),
    });
  }
  const chinese = document.editions.zh;
  const previousDocument = await readStoredDocument(
    env.KNOWLEDGE_BUCKET,
    id,
    "zh",
    previous.contentHash,
  );
  if (!previousDocument) throw new Error(`Canonical Chinese Markdown is missing for article ${id}`);
  let written: WrittenArticleDocument | null = null;
  const updated = await updateStoredArticle({
    writeDocuments: async () => {
      written = await writeDocument(
        env.KNOWLEDGE_BUCKET,
        articleObjectKey(id, "zh"),
        chinese.markdown,
        document.contentHash,
        previousDocument,
      );
    },
    switchRow: () =>
      updateArticleIf(env, id, previous, {
        ...(visibility === undefined ? {} : { visibility }),
        title: chinese.title,
        summary: chinese.summary,
        contentHash: document.contentHash,
        tagsJson: JSON.stringify(document.tags),
        updatedAt: nextUpdatedAt(previous.updatedAt),
      }),
    cleanupNewVersion: async () => {
      if (!written) return;
      await rollbackDocument(env.KNOWLEDGE_BUCKET, previousDocument, written);
      await deleteArticleCache(env.KNOWLEDGE_CACHE, id, document.contentHash, articleLocales);
    },
    cleanupPreviousVersion: () =>
      deleteArticleCache(env.KNOWLEDGE_CACHE, id, expectedHash, articleLocales),
  });
  if (!updated) return undefined;
  return updated;
}

export async function saveArticleTranslation(
  env: CloudflareEnv,
  id: string,
  locale: TranslationLocale,
  sourceHash: string,
  translation: ParsedArticleDocument,
  edit?: { expectedUpdatedAt: string; visibility?: Visibility | undefined },
): Promise<ArticleRow | undefined> {
  const article = await readArticleRow(env, "owner", id);
  if (!article || article.contentHash !== sourceHash) return;
  const previousTranslation = (await findTranslations(env, id)).find(
    (row) => row.locale === locale,
  );
  if (
    edit &&
    (article.updatedAt !== edit.expectedUpdatedAt || previousTranslation?.sourceHash !== sourceHash)
  )
    return undefined;
  const previous = previousTranslation
    ? await readStoredDocument(env.KNOWLEDGE_BUCKET, id, locale, previousTranslation.sourceHash)
    : null;
  if (previousTranslation && !previous) {
    throw new Error(`Translation Markdown is missing for article ${id}/${locale}`);
  }
  const written = await writeDocument(
    env.KNOWLEDGE_BUCKET,
    articleObjectKey(id, locale),
    translation.markdown,
    sourceHash,
    previous,
  );
  let updated = article;
  try {
    const row = {
      articleId: id,
      locale,
      title: translation.title,
      summary: translation.summary,
      sourceHash,
    };
    if (edit) {
      const committed = await saveTranslation(env, row, {
        expected: { contentHash: sourceHash, updatedAt: edit.expectedUpdatedAt },
        values: {
          updatedAt: nextUpdatedAt(article.updatedAt),
          ...(edit.visibility === undefined ? {} : { visibility: edit.visibility }),
        },
      });
      if (!committed) throw new Error("Article changed while saving its translation");
      updated = committed;
    } else await saveTranslation(env, row, null);
  } catch (error) {
    await rollbackDocument(env.KNOWLEDGE_BUCKET, previous, written);
    throw error;
  }
  const hashes = new Set([sourceHash]);
  if (previous) hashes.add(previous.contentHash);
  await Promise.all(
    [...hashes].map((hash) =>
      deleteArticleCache(
        env.KNOWLEDGE_CACHE,
        id,
        hash,
        edit?.visibility === "private" ? articleLocales : [locale],
      ),
    ),
  );
  return updated;
}

export async function setArticleVisibility(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
  visibility: "private" | "public",
): Promise<ArticleSummary | undefined> {
  const previous = await readArticleRow(env, "owner", id);
  if (!previous || previous.contentHash !== expectedHash) return undefined;
  const updated = await updateArticleIf(env, id, previous, {
    visibility,
    updatedAt: nextUpdatedAt(previous.updatedAt),
  });
  if (!updated) return undefined;
  if (visibility === "private") {
    await deleteArticleCache(env.KNOWLEDGE_CACHE, id, expectedHash, articleLocales);
  }
  return articleSummary(updated);
}

export async function deleteArticle(
  env: CloudflareEnv,
  id: string,
  expectedHash: string,
): Promise<boolean> {
  const previous = await readArticleRow(env, "owner", id);
  if (!previous || previous.contentHash !== expectedHash) return false;
  return deleteStoredArticle({
    hideRow: async () => {
      const hidden = await updateArticleIf(env, id, previous, { visibility: "private" });
      return Boolean(hidden);
    },
    cleanupVersion: async () => {
      const chinese = await readStoredDocument(
        env.KNOWLEDGE_BUCKET,
        id,
        "zh",
        previous.contentHash,
      );
      const translations = await findTranslations(env, id);
      const translatedDocuments = await Promise.all(
        translations.map((translation) =>
          readStoredDocument(env.KNOWLEDGE_BUCKET, id, translation.locale, translation.sourceHash),
        ),
      );
      const documents = [chinese, ...translatedDocuments].filter((document) => document !== null);
      await Promise.all([
        deleteStoredDocuments(env.KNOWLEDGE_BUCKET, documents),
        deleteArticleCache(env.KNOWLEDGE_CACHE, id, expectedHash, articleLocales),
      ]);
    },
    deleteRow: async () => {
      return Boolean(await deleteArticleIf(env, id, previous));
    },
  });
}
