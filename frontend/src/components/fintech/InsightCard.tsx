import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: "accent" | "danger" | "warning" | "primary";
  className?: string;
};

const border = {
  accent: "border-t-accent",
  danger: "border-t-danger",
  warning: "border-t-warning",
  primary: "border-t-primary dark:border-t-white/30",
};

export function InsightCard({
  title,
  subtitle,
  children,
  accent = "primary",
  className = "",
}: Props) {
  return (
    <article
      className={`rounded-2xl border border-primary/8 bg-white p-5 shadow-card ring-1 ring-primary/5 transition hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:ring-white/5 ${border[accent]} border-t-4 ${className}`}
    >
      <h3 className="text-base font-bold text-primary dark:text-white">{title}</h3>
      {subtitle ? (
        <p className="mt-0.5 text-sm text-primary/60 dark:text-slate-400">{subtitle}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </article>
  );
}
