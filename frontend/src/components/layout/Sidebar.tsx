import { NavLink } from "react-router-dom";

const linkClass =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-white/10";
const activeClass = "bg-white/15 text-white";
const idleClass = "text-white/70 hover:text-white";

const items = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/transactions", label: "Transações", end: false },
  { to: "/insights", label: "Insights", end: false },
  { to: "/goals", label: "Metas", end: false },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
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
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
