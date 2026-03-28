import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

type Props = {
  onMenuClick?: () => void;
  title?: string;
};

export function Navbar({ onMenuClick, title }: Props) {
  const { logout, userId } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-primary/10 bg-white/90 px-4 backdrop-blur-md transition-colors dark:border-white/10 dark:bg-slate-900/90 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex h-11 min-h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-primary ring-1 ring-primary/10 transition hover:bg-primary/5 dark:bg-white/10 dark:text-white md:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <span className="text-lg leading-none">☰</span>
        </button>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary/45">
            Controle inteligente
          </p>
          <h1 className="text-lg font-bold text-primary">{title ?? "Painel"}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl bg-surface px-3 text-sm font-semibold text-primary ring-1 ring-primary/10 transition hover:bg-primary/5 dark:bg-white/10 dark:text-white dark:ring-white/15"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <span className="hidden text-sm text-primary/55 dark:text-slate-400 sm:inline">
          ID <span className="font-semibold text-primary dark:text-white">{userId ?? "—"}</span>
        </span>
        <Button
          variant="outline"
          className="min-h-11 !py-2.5 text-sm dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
          onClick={() => logout()}
        >
          Sair
        </Button>
      </div>
    </header>
  );
}
