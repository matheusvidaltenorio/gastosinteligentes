import { NavLink } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";

const linkClass =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-white/10";
const activeClass = "bg-white/15 text-white";
const idleClass = "text-white/70 hover:text-white";

const items = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/transactions", label: "Transações", end: false },
  { to: "/insights", label: "Insights", end: false },
  { to: "/events", label: "Eventos", end: false },
  { to: "/goals", label: "Metas", end: false },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `${linkClass} ${isActive ? activeClass : idleClass}`
            }
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-white/15"
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          <span>{theme === "dark" ? "☀️" : "🌙"}</span>
          <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
        </button>
      </div>
    </div>
  );
}
