import { useLocation } from "react-router-dom";
import { UserCircle } from "lucide-react";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/new-session": "New Session — Patient Intake",
  "/tasks/visual-search": "Visual Search Task",
  "/tasks/memory": "Memory & Recognition Task",
  "/tasks/reading": "Reading Task",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function HeaderBar() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? "EyeCog";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-400">{today}</p>
      </div>
      <div className="flex items-center gap-2 text-slate-500">
        <UserCircle className="h-7 w-7" />
        <span className="text-sm font-medium">Clinician</span>
      </div>
    </header>
  );
}
