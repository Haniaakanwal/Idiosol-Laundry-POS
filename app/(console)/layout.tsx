"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { RequireAdmin } from "@/components/guards";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("laundry-sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  function toggleCollapse() {
    setCollapsed((c) => {
      localStorage.setItem("laundry-sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }

  return (
    <RequireAdmin>
      <div className="min-h-screen">
        <Sidebar open={open} onClose={() => setOpen(false)} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-slate-900">LaundryPOS</span>
        </header>
        <main className={`transition-all duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-60"}`}>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </RequireAdmin>
  );
}