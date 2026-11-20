# Sticker catalog

`suzume5` (撕梓咩 S5, 32 items) and `denghuoju8` (灯火橘8, 80 items) are mirrored from their
Telegram sets `SuzumeS5` and `in_AJEJDC_by_NaiDrawBot` into R2 as
`knowledge/img/sticker-<pack>-<name>.webp`, served immutably by `/img/{name}` at the site origin.
Names are two-digit Telegram order, except `suzume5` 31–32, which were added later. The one
video sticker (`denghuoju8_66`) is stored as animated WebP. Mirrors are owner-authorized; rights
remain with their authors.

The retired `suzume` key named 16 images from Suzume’s former site, which stopped serving them;
articles moved to `suzume5` equivalents, and the key must not be reused. `baishengnv` references
117 Stickers.wiki images. Never reuse names for different artwork; migrate
article shortcodes before removing a pack, because unknown shortcodes remain literal.

`packages/content/src/emoji-packs.json` matches Vesper's `crates/md-dialect/src/emoji-packs.json`.
Packs contain `key` (ASCII alphanumeric), `name`, `display` (`emoji` or `sticker`), and `items`
(`name`, HTTPS `value`). Item names exclude whitespace/colons. Duplicate shortcodes and URLs
containing credentials are invalid. Matching is case-sensitive; code, math, links, image alt text
and generated embeds stay unchanged. Compilation never downloads images or requires Telegram
credentials. Display preserves aspect ratio within 6rem.
