import type { ReactNode } from 'react';

interface PageLayoutProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** Consistent page shell: title, optional description, optional action, content. */
export default function PageLayout({ title, description, action, children }: PageLayoutProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-gray-400">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}
