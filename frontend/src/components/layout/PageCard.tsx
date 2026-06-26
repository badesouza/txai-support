import type { ReactNode } from 'react';

interface PageCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

/** Dark glass surface card for tables, forms and dashboard blocks. */
export default function PageCard({ children, className = '', noPadding = false }: PageCardProps) {
  return (
    <div
      className={`surface-card ${noPadding ? '' : 'p-5'} ${className}`}
    >
      {children}
    </div>
  );
}
