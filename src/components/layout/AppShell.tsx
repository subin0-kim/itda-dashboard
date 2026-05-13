import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
