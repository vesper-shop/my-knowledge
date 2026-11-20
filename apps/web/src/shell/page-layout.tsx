import type { ReactNode } from "react";

type PageLayoutProps = {
  action: ReactNode | null;
  children: ReactNode;
  hideTitle?: boolean;
  title: string;
};

export function PageLayout({ action, children, hideTitle = false, title }: PageLayoutProps) {
  return (
    <div className="page-shell">
      <header className={hideTitle && !action ? "sr-only" : "page-heading"}>
        <div className="flex items-center justify-between gap-4">
          <h1 className={hideTitle ? "sr-only" : undefined}>{title}</h1>
          {action}
        </div>
      </header>
      <div className="page-content">{children}</div>
    </div>
  );
}
