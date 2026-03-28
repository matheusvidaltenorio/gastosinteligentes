import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-primary text-white hover:bg-secondary shadow-sm hover:shadow-md active:scale-[0.98]",
  accent:
    "bg-accent text-primary font-semibold hover:brightness-110 active:scale-[0.98] shadow-sm",
  danger:
    "bg-danger text-white hover:brightness-110 active:scale-[0.98]",
  ghost:
    "bg-transparent text-primary hover:bg-primary/5 ring-1 ring-primary/10 hover:ring-primary/20",
  outline:
    "bg-white text-primary ring-1 ring-primary/15 hover:bg-surface hover:ring-primary/25",
} as const;

type Variant = keyof typeof variants;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  className = "",
  children,
  disabled,
  loading,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spinSlow rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}
