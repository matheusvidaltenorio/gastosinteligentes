import { forwardRef, type SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, id, className = "", children, ...rest },
  ref
) {
  const sid = id ?? rest.name ?? "select";
  return (
    <div className="w-full">
      <label
        htmlFor={sid}
        className="mb-1.5 block text-sm font-medium text-primary/80 dark:text-white/80"
      >
        {label}
      </label>
      <select
        ref={ref}
        id={sid}
        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm transition focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-white/15 dark:bg-slate-900 dark:text-white ${
          error
            ? "border-danger ring-1 ring-danger/30"
            : "border-primary/10 hover:border-primary/20 dark:hover:border-white/25"
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error ? <p className="mt-1 text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
});
