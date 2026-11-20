# Frontend design

Pages share a 650px column with 72px top spacing and a skip link. Home shows the avatar, yearly article lists, dates and visibility pills. The avatar supplies icons; the footer links socials, RSS and source.

Reading/editing hides language, theme and account controls. The owner expander reveals navigation, creation and account controls; Return sits in the left gutter, above the title on phones; share and edit right, without statistics or TOC; previous/next links end articles. Icons have labels; clipboard results use toasts.

Editors open in Markdown source with read-only Milkdown Preview. Metadata controls measure 32px; writing areas use at least 448px or 65svh, 14px desktop/16px phone text and 1.5 line spacing. Source resizes vertically; preview tables scroll internally.

Silver/slate blue/matcha/amber support 16px/1.8 reading with Geist, Geist Mono and Lora. Diagrams wrap labels; tables scroll by keyboard. At ≤720px, table labels/URLs wrap, and search focus has no glow. Code wraps with top-right copy. Annotation arrows follow highlights. Emoji: 2rem; stickers: ≤6rem. Markdown images load lazily without referrers.

Tweet cards isolate component styles from prose and use theme tokens, author headers, readable text, media and dates. Images keep aspect ratios; videos play on demand.

Verify through the [frontend specification](../.agents/specs/frontend.md).
