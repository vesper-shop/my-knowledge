import { IntentLink } from "@/shell/intent-link";

import type { InterfaceMessages } from "@/i18n/registry";

type AdjacentLink = { href: string; title: string } | null;

type ArticlePagerProps = {
  messages: InterfaceMessages["article"];
  next: AdjacentLink;
  previous: AdjacentLink;
};

export function ArticlePager({ messages, next, previous }: ArticlePagerProps) {
  if (!next && !previous) return null;
  return (
    <nav className="article-pager" aria-label={messages.adjacentArticles}>
      {previous ? (
        <IntentLink href={previous.href} rel="prev">
          <span>{messages.previousArticle}</span>
          <strong>{previous.title}</strong>
        </IntentLink>
      ) : null}
      {next ? (
        <IntentLink href={next.href} rel="next">
          <span>{messages.nextArticle}</span>
          <strong>{next.title}</strong>
        </IntentLink>
      ) : null}
    </nav>
  );
}
