import handler from "@tanstack/react-start/server-entry";

import { readIndex } from "@/articles";
import { resolveInterfaceI18n } from "./i18n/registry";

export { ArticleWriter } from "./articles/writer";

const discoveryLinks = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</api/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '<https://github.com/Pleasurecruise/my-knowledge/blob/main/docs/API.md>; rel="service-doc"; type="text/html"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
].join(", ");

async function render(request: Request, url: URL) {
  const rendered = await handler.fetch(request);
  const response = new Response(rendered.body, rendered);
  if (
    !response.headers.has("cache-control") &&
    response.headers.get("content-type")?.startsWith("text/html")
  )
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate",
    );
  if (url.pathname === "/") response.headers.set("Link", discoveryLinks);
  if (url.hostname === "localhost")
    response.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const articleId = url.pathname.startsWith("/articles/")
      ? url.pathname.slice("/articles/".length)
      : null;
    if (
      request.method !== "GET" ||
      request.headers.has("cookie") ||
      (url.pathname !== "/" && (articleId === null || articleId === "" || articleId.includes("/")))
    )
      return render(request, url);
    const { articles } = await readIndex(env);
    const article = articles.find((row) => row.id === articleId && row.visibility === "public");
    const version =
      articleId === null
        ? `${articles.length}-${articles.reduce((latest, row) => (row.updatedAt > latest ? row.updatedAt : latest), "")}`
        : article && article.updatedAt;
    if (!version) return render(request, url);
    const locale = resolveInterfaceI18n(undefined, request.headers.get("accept-language")).code;
    const etag = `W/"${env.CF_VERSION_METADATA.id}:${locale}:${version}:${url.search}"`;
    if (request.headers.get("if-none-match") === etag)
      return new Response(null, {
        status: 304,
        headers: { "Cache-Control": "private, no-cache", ETag: etag },
      });
    const key = new URL(url);
    key.searchParams.set("__version", version);
    key.searchParams.set("__deployment", env.CF_VERSION_METADATA.id);
    key.searchParams.set("__locale", locale);
    const pages = await caches.open("pages");
    const cached = await pages.match(key);
    if (cached) {
      const hit = new Response(cached.body, cached);
      hit.headers.set("Cache-Control", "private, no-cache");
      hit.headers.set("ETag", etag);
      return hit;
    }
    const response = await render(request, url);
    if (response.status !== 200 || response.headers.has("set-cookie")) return response;
    const stored = new Response(response.clone().body, response);
    stored.headers.set("Cache-Control", "public, max-age=86400");
    ctx.waitUntil(pages.put(key, stored));
    response.headers.set("Cache-Control", "private, no-cache");
    response.headers.set("ETag", etag);
    return response;
  },
} satisfies ExportedHandler<CloudflareEnv>;
