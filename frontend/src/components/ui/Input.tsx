import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, id, className = "", ...rest },
  ref
) {
  const inputId = id ?? rest.name ?? label.replace(/\s/g, "-").toLowerCase();
  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-sm font-medium text-primary/80 dark:text-white/80"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm transition focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-white/15 dark:bg-slate-900 dark:text-white ${
          error
            ? "border-danger ring-1 ring-danger/30"
            : "border-primary/10 hover:border-primary/20 dark:hover:border-white/25"
        } ${className}`}
        {...rest}
      />
      {hint && !error ? (
        <p className="mt-1 text-xs text-primary/50">{hint}</p>
      ) : null}
      {error ? <p className="mt-1 text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
});
