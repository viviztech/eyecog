import { Route, Routes } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { NewSessionPage } from "@/pages/NewSessionPage";
import { VisualSearchTaskPage } from "@/pages/VisualSearchTaskPage";
import { MemoryTaskPage } from "@/pages/MemoryTaskPage";
import { ReadingTaskPage } from "@/pages/ReadingTaskPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/new-session" element={<NewSessionPage />} />
        <Route path="/tasks/visual-search" element={<VisualSearchTaskPage />} />
        <Route path="/tasks/memory" element={<MemoryTaskPage />} />
        <Route path="/tasks/reading" element={<ReadingTaskPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
