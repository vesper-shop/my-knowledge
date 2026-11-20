# Frontend design

Pages share a 650px column with 72px top spacing and a skip link. Home shows the avatar, yearly article lists, dates and visibility pills. The avatar supplies browser icons; footer links cover social, RSS, source.

Article reading/editing hides language, theme and account controls. The owner expander reveals navigation, creation and account controls; Escape closes it. Return sits top-left; share and edit sit beside the title, without statistics or TOC. Icons have labels; clipboard results use localized bottom toasts.

Shared components own controls. Editors open in Markdown source with read-only Milkdown Preview. Metadata controls measure 32px; writing areas use at least 448px or 65svh, 14px desktop/16px phone text and 1.5 line spacing. Source resizes vertically; preview tables scroll internally.

Silver/slate blue/matcha/amber support 16px/1.8 reading with Geist, Geist Mono and Lora. Diagrams wrap labels; tables support keyboard scrolling. At ≤720px, table labels/URLs wrap, and search focus has no glow. Code wraps with top-right copy. Annotation arrows follow highlights. Emoji: 2rem; stickers: ≤6rem. Markdown images load lazily without referrers.

Tweet cards isolate component styles from prose and use theme tokens, author headers, readable text, media and dates. Images preserve aspect ratios; videos play on demand.

Verify through the [frontend specification](../.agents/specs/frontend.md).
