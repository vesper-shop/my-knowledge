import type { ReactNode } from "react";

type ArticleHeaderProps = {
  back: ReactNode;
  children: ReactNode;
  title: string;
};

export function ArticleHeader({ back, children, title }: ArticleHeaderProps) {
  return (
    <header className="article-heading">
      {back}
      <div className="article-heading-top">
        <h1 className="font-serif text-[length:var(--text-section)] font-normal leading-[var(--leading-heading)] text-foreground">
          {title}
        </h1>
        {children}
      </div>
    </header>
  );
}
