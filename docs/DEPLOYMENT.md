# Deployment

apps/web/wrangler.json owns Worker bindings, assets and domains. Credentials belong in secrets or .dev.vars.

SITE_URL defines the canonical origin. The owner signs in with Vesper at /api/auth/sign-in; the site registers itself as a Vesper OAuth client on first use and keeps the client in KV.

pnpm dev runs Vite with the Worker, Durable Objects and remote storage in workerd. pnpm preview serves the production build. Browser tests build with `--mode test`, which bundles wrangler.test.json local bindings.

Monitoring redacts query strings.

Before release, run check, test, build, dry-run and relevant browser contracts. Durable Object exports declare current SQLite classes without migration tags. When the article index format changes, rewrite `knowledge/index.json` from the previous one and verify R2 hashes; rebuild incompatible stores instead of adding upgrade code. Preserve canonical content and shared resources. Rebuild R2 version metadata when replacing stored formats. After compiler or rendering dependency changes, delete only KNOWLEDGE_CACHE keys prefixed `compiled/`; the new Worker rebuilds them on reads. Preserve other KV keys and R2. Git and deployment require authorization. Verify ingestion, privacy and cleanup after rebuilding.
