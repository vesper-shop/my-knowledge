import { useContext, useEffect, useState } from "react";
import { ArticleReturnContext } from "./reading-trail";
import { Share2, Pencil, Undo2 } from "@my-knowledge/ui/icons";

import { toast } from "@my-knowledge/ui/components/toast";

import { IntentLink } from "@/shell/intent-link";

import type { InterfaceMessages } from "@/i18n/registry";

type ArticleNavigationActionsProps = {
  articleHref: string;
  edit: { enabled: false } | { enabled: true; href: string };
  messages: InterfaceMessages["article"];
};

type ArticleReturnLinkProps = {
  label: string;
  returnHref: string;
};

export function ArticleReturnLink({ label, returnHref }: ArticleReturnLinkProps) {
  const destination = useContext(ArticleReturnContext) ?? returnHref;
  return (
    <IntentLink className="article-return" href={destination}>
      <Undo2 aria-hidden="true" />
      {label}
    </IntentLink>
  );
}

export function ArticleNavigationActions({
  articleHref,
  edit,
  messages,
}: ArticleNavigationActionsProps) {
  const [copying, setCopying] = useState(false);
  const [fragment, setFragment] = useState("");
  useEffect(() => {
    const updateFragment = () => setFragment(window.location.hash);
    updateFragment();
    window.addEventListener("hashchange", updateFragment);
    return () => window.removeEventListener("hashchange", updateFragment);
  }, []);
  async function copyLink() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(new URL(articleHref, window.location.origin).href);
      toast.add({ id: "article-link", title: messages.linkCopied });
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "NotAllowedError") throw error;
      toast.add({ id: "article-link", title: messages.linkCopyFailed });
    } finally {
      setCopying(false);
    }
  }
  return (
    <div className="article-reading-actions">
      <div className="article-share">
        <button
          type="button"
          className="article-copy"
          aria-label={messages.copyLink}

          disabled={copying}
          onClick={() => void copyLink()}
        >
          <Share2 aria-hidden="true" />
        </button>
      </div>
      {edit.enabled ? (
        <IntentLink
          className="article-edit"
          href={`${edit.href}${fragment}`}
          aria-label={messages.edit}
        >
          <Pencil aria-hidden="true" />
        </IntentLink>
      ) : null}
    </div>
  );
}
