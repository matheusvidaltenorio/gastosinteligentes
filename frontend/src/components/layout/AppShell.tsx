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
    <div className="flex min-h-screen bg-surface transition-colors dark:bg-slate-950">
      {/* Mobile: drawer fixo. Desktop (md+): static — rola junto com a página, não fica preso à viewport. */}
      <aside
        className={`flex w-64 shrink-0 flex-col border-r border-white/10 bg-primary transition-transform duration-300 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 md:static md:z-auto ${
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

      <div className="flex min-h-screen flex-1 flex-col md:ml-0">
        <Navbar title={title} onMenuClick={() => setOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
