import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
};

export function Card({ children, className = "", title, subtitle, action }: Props) {
  return (
    <section
      className={`min-w-0 max-w-full rounded-2xl bg-white p-5 shadow-card ring-1 ring-primary/5 transition hover:ring-primary/10 dark:bg-slate-900 dark:ring-white/10 dark:hover:ring-white/15 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? (
              <h3 className="text-base font-bold text-primary dark:text-white">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 text-sm text-primary/60 dark:text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
