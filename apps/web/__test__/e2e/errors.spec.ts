import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { getPlatformProxy } from "wrangler";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
  articleRowSchema,
  articleTranslationRowSchema,
} from "../../src/articles/persistence/store";

const appDirectory = new URL("../../", import.meta.url);

async function fixtureRow(env: CloudflareEnv, id: string) {
  const stored = await env.KNOWLEDGE_BUCKET.get("knowledge/index.json");
  const index = stored
    ? z
        .object({
          articles: z.array(articleRowSchema),
          translations: z.array(articleTranslationRowSchema),
        })
        .parse(await stored.json())
    : { articles: [], translations: [] };
  index.articles.push({
    id,
    title: "Reading recovery",
    summary: "Recovery fixture",
    contentHash: "a".repeat(64),
    tagsJson: '["daily"]',
    visibility: "private",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  });
  await env.KNOWLEDGE_BUCKET.put("knowledge/index.json", JSON.stringify(index));
}

const testEnvironment = () =>
  getPlatformProxy<CloudflareEnv>({
    configPath: fileURLToPath(new URL("wrangler.test.json", appDirectory)),
    persist: { path: fileURLToPath(new URL(".wrangler/test-state/v3", appDirectory)) },
  });

test("keeps stored invalid embeds readable and editable", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  const id = randomUUID();
  const { env, dispose } = await testEnvironment();
  try {
    await fixtureRow(env, id);
    await env.KNOWLEDGE_BUCKET.put(
      `knowledge/${id}/zh.md`,
      "---\ntitle: Reading recovery\nsummary: Recovery fixture\ntags: [daily]\n---\nBefore the block.\n\n```embed:article\nid: removed-target\n```\n\nAfter the block.\n",
      { customMetadata: { contentHash: "a".repeat(64) } },
    );
    await page.goto(`/articles/${id}`);
    await expect(page.locator("article")).toContainText("After the block.");
    await expect(page.locator(".markdown-block-error").getByRole("alert")).toContainText(
      "Invalid article list URL",
    );
    await page.screenshot({ path: testInfo.outputPath("invalid-embed-light.png"), fullPage: true });
    await page.locator(".article-edit").click();
    await expect(page.locator("#article-title")).toHaveValue("Reading recovery");
    await page.getByRole("button", { name: "源码", exact: true }).click();
    await expect(page.locator("textarea")).toHaveValue(/id: removed-target/u);
    expect(errors).toEqual([]);
  } finally {
    await dispose();
  }
});

test("shows recoverable error and not-found pages at reading width", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const id = randomUUID();
  const { env, dispose } = await testEnvironment();
  try {
    await fixtureRow(env, id);
  } finally {
    await dispose();
  }
  await page.goto(`/articles/${id}`);
  await expect(page.getByRole("heading", { name: "这页暂时无法载入。" })).toBeVisible();
  await page.getByRole("button", { name: "重新载入", exact: true }).focus();
  await expect(page.getByRole("button", { name: "重新载入", exact: true })).toBeFocused();
  for (const theme of ["light", "dark"]) {
    await page.emulateMedia({
      colorScheme: theme === "light" ? "light" : "dark",
      reducedMotion: "reduce",
    });
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
      document.documentElement.classList.toggle("dark", value === "dark");
    }, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`error-${theme}.png`), fullPage: true });
  }
  expect(errors.length).toBeGreaterThan(0);
  expect(
    errors.every((error) =>
      /Canonical zh Markdown is missing|500 \(Internal Server Error\)/u.test(error),
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "返回首页", exact: true }).click();
  await expect(page).toHaveURL(/\/$/u);
  await page.goto("/articles/missing-error-page-fixture");
  await expect(page.getByRole("heading")).toBeVisible();
  await expect(page.getByRole("link", { name: "返回首页", exact: true })).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("not-found.png"), fullPage: true });
});
