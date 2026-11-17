# Database and persistence

There is no database. `knowledge/index.json` in R2 holds every article's metadata, visibility and versions, and each translation's locale and source hash; stale editions are unreadable. Index writes are conditional on its ETag and retry when another writer won. Owner sessions live in KV; Vesper owns identity.

R2 owns knowledge/{id} Markdown. KV caches public editions by ID/hash/locale; errors propagate and misses read R2.

Creation writes Chinese R2, then adds the article to the index. Rollback checks R2 ETags.

Updates require expectedHash and expectedUpdatedAt, use ETags, then switch content and visibility together in the index. Saves and visibility changes advance updatedAt. Visibility-only updates skip R2. R2 contentHash must match the index. Translation edits preserve Chinese/siblings, require current editions, and update the translation with the article's metadata, visibility and updatedAt in one index write after R2; invalidate affected caches.

Deletion records a durable writer tombstone, hides the article in the index, removes external artifacts, then removes it and its translations from the index last. Failure permits same-version retries, tolerating removed objects; completed deletion returns not found.

Compiled trees use `compiled/{digest}.json`, hashing body, labels and enrichment mode. Metadata edits reuse compiled bodies. KV retains artifacts up to 20 MiB for 24 hours; larger results render without persistence. Clear `compiled/` after compiler/dependency output changes. Index authorization precedes reads; private articles bypass artifact KV. LRU memory separates KV bindings and private content: sixteen entries, thirty-second non-sliding TTL, 128-Ki-character keys and 512-Ki-character entries. Failures evict; KV hits never renew storage TTL.
