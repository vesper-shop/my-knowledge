import tweet from "../fixtures/tweet.json" with { type: "json" };
import index from "../fixtures/index.json" with { type: "json" };
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";

import { getPlatformProxy } from "wrangler";
import { fileURLToPath } from "node:url";

const appDirectory = new URL("../../", import.meta.url);

const objects: Array<[fixture: string, objectPath: string]> = [
  ["rich", "11111111-1111-4111-8111-111111111111"],
  ["related", "22222222-2222-4222-8222-222222222222"],
  ["private", "33333333-3333-4333-8333-333333333333"],
];

// This directory belongs exclusively to disposable browser fixtures.
await rm(new URL(".wrangler/test-state", appDirectory), { recursive: true, force: true });

const session = crypto.randomUUID();
const sessionSeconds = 60 * 60 * 24 * 7;
const authDirectory = new URL("../.auth/", import.meta.url);
await mkdir(authDirectory, { recursive: true });
await writeFile(
  new URL("owner.json", authDirectory),
  `${JSON.stringify(
    {
      cookies: [
        {
          name: "knowledge_session",
          value: session,
          domain: "127.0.0.1",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
          expires: Math.floor(Date.now() / 1_000) + sessionSeconds,
        },
      ],
      origins: [],
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const { env, dispose } = await getPlatformProxy<CloudflareEnv>({
  configPath: fileURLToPath(new URL("wrangler.test.json", appDirectory)),
  persist: { path: fileURLToPath(new URL(".wrangler/test-state/v3", appDirectory)) },
});
try {
  await env.KNOWLEDGE_CACHE.put(`session:${session}`, "owner", { expirationTtl: sessionSeconds });
  await env.KNOWLEDGE_CACHE.put("embed:twitter:12345", JSON.stringify(tweet), {
    expirationTtl: 3600,
  });
  await env.KNOWLEDGE_BUCKET.put("knowledge/index.json", JSON.stringify(index));
  for (const [fixture, objectPath] of objects) {
    const row = index.articles.find((article) => article.id === objectPath);
    if (!row) throw new Error("Missing fixture row");
    for (const locale of ["zh", "en", "ja"]) {
      const edition = await readFile(
        new URL(`../fixtures/${fixture}/${locale}.md`, import.meta.url),
        "utf8",
      );
      const key = locale === "zh" ? "zh.md" : `i18n/${locale}.md`;
      await env.KNOWLEDGE_BUCKET.put(`knowledge/${objectPath}/${key}`, edition, {
        customMetadata: { contentHash: row.contentHash },
      });
    }
  }
} finally {
  await dispose();
}
