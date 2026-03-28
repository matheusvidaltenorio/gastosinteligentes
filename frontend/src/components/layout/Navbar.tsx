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
    <header className="fixed top-0 z-40 box-border flex h-14 min-h-14 w-full max-w-full min-w-0 items-center gap-2 overflow-hidden border-b border-primary/10 bg-white/95 px-2.5 backdrop-blur-md transition-colors dark:border-white/10 dark:bg-slate-900/95 sm:h-16 sm:min-h-16 sm:gap-3 sm:px-4 md:left-64 md:w-[calc(100%-16rem)] md:max-w-none md:px-5">
      <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary ring-1 ring-primary/10 transition hover:bg-primary/5 dark:bg-white/10 dark:text-white md:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <span className="text-lg leading-none">☰</span>
        </button>
        <div className="min-w-0">
          <p className="hidden text-[10px] font-medium uppercase tracking-wider text-primary/45 sm:block sm:text-xs">
            Controle inteligente
          </p>
          <h1 className="truncate text-base font-bold leading-tight text-primary dark:text-white sm:text-lg">
            {title ?? "Painel"}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-base ring-1 ring-primary/10 transition hover:bg-primary/5 dark:bg-white/10 dark:text-white dark:ring-white/15 sm:h-11 sm:w-11 sm:text-lg"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <span className="hidden text-sm text-primary/55 lg:inline dark:text-slate-400">
          ID{" "}
          <span className="font-semibold text-primary dark:text-white">
            {userId ?? "—"}
          </span>
        </span>
        <Button
          variant="outline"
          className="min-h-10 shrink-0 px-2.5 py-2 text-xs font-semibold sm:min-h-11 sm:px-4 sm:text-sm dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
          onClick={() => logout()}
        >
          Sair
        </Button>
      </div>
    </header>
  );
}
