# Architecture

One TanStack Start app runs as one Cloudflare Worker through the Cloudflare Vite plugin. Generation/translation run locally. `packages/content` owns schemas and the shared Markdown parser; `packages/ui` owns presentation. Web owns transports, operations and adapters, depending on shared packages.

ArticleWriter Durable Objects serialize mutations and rollback; only deletion markers are durable. R2 owns Markdown and the article index (`knowledge/index.json`); KV holds owner sessions and derived caches.

```mermaid
flowchart LR
  MCP[MCP Bearer key] --> Read[Read tools]
  Owner[Owner session] --> Write[ArticleWriter mutations]
  Read --> Index[R2 article index]
  Write --> Index
  Search[Keyword search] --> Index
  Index --> Summary[Browser summaries]
  Index --> Body[Version-checked KV / R2 bodies]
```

Social metadata uses anonymous authorization; images remain no-store. Lists read summaries; links prefetch only on intent. The owner signs in with Vesper (OAuth with PKCE); the callback accepts only the workspace whose UUID matches and stores a session id in KV; sessions memoize per request. Pages/APIs enforce authorization; browsers receive client IDs. Route loaders call server functions; locale and authorization keep pages dynamic. Client loader data stays fresh for a minute; Article data never refreshes in the background, so streamed embeds do not flash. The header follows the rendered route, not the pending location.

Public Markdown uses bounded LRU before KV. Concurrent misses share reads, compilation and writes; hits skip parsing, highlighting and KaTeX. Metadata deduplicates per request/principal. Authorization and provider cards remain request-scoped; private articles bypass artifact KV. Card providers declare URLs, parsing and caching; shared transport bounds time, size and redirects. Loaders stream compiled trees and pending provider cards; Mermaid, Vega and Canvas render in browsers. [Database](DATABASE.md) owns retention; [API](API.md) owns credentials.

The Worker entry (`src/server.ts`) serves cookieless `GET /` and `GET /articles/{id}` documents from the edge Cache API. Keys add the resolved interface locale, the Worker version ID (cached HTML names hashed build assets) and an index version: the public article's `updatedAt`, or the article count and latest `updatedAt` for Home. Saves, visibility changes and deletions change the version, so withdrawn or deleted articles never match a cached document.
