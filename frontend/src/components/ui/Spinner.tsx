export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12"
      role="status"
      aria-label={label}
    >
      <div className="h-10 w-10 animate-spinSlow rounded-full border-2 border-primary/15 border-t-accent" />
      <p className="text-sm font-medium text-primary/50">{label}</p>
    </div>
  );
}
