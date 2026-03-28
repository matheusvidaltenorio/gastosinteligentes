import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

type Props = {
  children: ReactNode;
  title?: string;
};

export function AppShell({ children, title }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-surface transition-colors dark:bg-slate-950">
      {/* Mobile: drawer. Desktop: sidebar fixa. translate só no mobile (evita transform no desktop = fixed relativo à viewport). */}
      <aside
        className={`flex w-64 max-w-[min(16rem,100%)] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-primary max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:h-full max-md:transition-transform max-md:duration-300 md:fixed md:inset-y-0 md:left-0 md:z-30 md:h-screen md:translate-x-0 ${
          open ? "max-md:translate-x-0" : "max-md:-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-lg font-bold text-accent">
            ₢
          </div>
          <div>
            <Link to="/" className="block font-bold text-white" onClick={() => setOpen(false)}>
              Gastos IA
            </Link>
            <p className="text-xs text-white/50">Fintech pessoal</p>
          </div>
        </div>
        <Sidebar onNavigate={() => setOpen(false)} />
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-primary/40 backdrop-blur-sm md:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-h-screen w-full min-w-0 max-w-full flex-col md:ml-64">
        <Navbar title={title} onMenuClick={() => setOpen(true)} />
        <main className="mt-14 box-border flex-1 min-w-0 max-w-full p-3 pt-4 sm:mt-16 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
