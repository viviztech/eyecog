import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  PlusSquare,
  Target,
  Brain,
  BookOpenText,
  FileBarChart,
  Settings,
  Eye,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/new-session", label: "New Session", icon: PlusSquare },
  { to: "/tasks/visual-search", label: "Visual Search", icon: Target },
  { to: "/tasks/memory", label: "Memory Task", icon: Brain },
  { to: "/tasks/reading", label: "Reading Task", icon: BookOpenText },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col bg-eyecog-navy text-slate-300">
      <div className="flex items-center gap-2 px-6 py-6">
        <Eye className="h-6 w-6 text-eyecog-teal" />
        <div>
          <div className="text-lg font-bold text-white">EyeCog</div>
          <div className="text-xs text-slate-500">v2.0</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-eyecog-navy-light text-white"
                  : "text-slate-400 hover:bg-eyecog-navy-light hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-eyecog-navy-light px-6 py-4 text-xs text-slate-500">
        Visual&ndash;Cognitive Assessment Software
      </div>
    </aside>
  );
}
