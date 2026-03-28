import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export function PublicEventShell({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-surface transition-colors dark:bg-slate-950">
      <header className="border-b border-primary/10 bg-primary px-4 py-3 dark:border-white/10">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <Link
            to="/login"
            className="font-bold text-white hover:text-white/90"
          >
            Gastos IA
          </Link>
          <nav className="flex gap-3 text-sm text-white/80">
            <Link to="/events/join" className="hover:text-white">
              Entrar com código
            </Link>
            <Link to="/login" className="hover:text-white">
              Entrar
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        {title ? (
          <h1 className="mb-6 text-xl font-bold text-primary dark:text-white">
            {title}
          </h1>
        ) : null}
        {children}
      </main>
    </div>
  );
}
