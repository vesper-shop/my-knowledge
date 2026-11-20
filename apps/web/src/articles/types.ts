import type { Article, ArticleSummary, TranslationLocale, Visibility } from "@my-knowledge/content";

import type { InterfaceMessages } from "@/i18n/registry";

export type ArticleListQuery = {
  visibility: "private" | "public" | undefined;
  tags: readonly string[];
  cursor: string | undefined;
  limit: number;
};

export type ArticlePage = {
  articles: ArticleSummary[];
  nextCursor: string | null;
};

export type TagCount = {
  count: number;
  path: string;
};

export type ArticleDraft = {
  body: string;
  summary: string;
  tags: string[];
  title: string;
};

export type ArticleTranslationDraft = Omit<ArticleDraft, "tags"> & {
  locale: TranslationLocale;
  visibility?: Visibility | undefined;
};

export type ArticleDocuments = {
  zh: string;
  en?: string | undefined;
  ja?: string | undefined;
};

export type ArticleUpdateResult =
  | { status: "updated"; article: Article }
  | { status: "notFound" }
  | { status: "stale" };

export type ExistingArticleEditor = {
  locale: "zh" | TranslationLocale;
  body: string;
  contentHash: string;
  updatedAt: string;
  id: string;
  summary: string;
  tags: string[];
  title: string;
  visibility: Visibility;
};

export type ArticleEditorProps = {
  messages: InterfaceMessages["article"];
} & ({ mode: "create" } | { mode: "edit"; article: ExistingArticleEditor });
