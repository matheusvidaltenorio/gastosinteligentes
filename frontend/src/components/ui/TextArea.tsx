import { forwardRef, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export const TextArea = forwardRef<HTMLTextAreaElement, Props>(
  function TextArea({ label, error, id, className = "", ...rest }, ref) {
    const inputId = id ?? rest.name ?? "textarea";
    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-primary/80"
        >
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          rows={3}
          className={`w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm transition focus:outline-none focus:ring-2 focus:ring-accent/40 ${
            error
              ? "border-danger ring-1 ring-danger/30"
              : "border-primary/10 hover:border-primary/20"
          } ${className}`}
          {...rest}
        />
        {error ? (
          <p className="mt-1 text-xs font-medium text-danger">{error}</p>
        ) : null}
      </div>
    );
  }
);
