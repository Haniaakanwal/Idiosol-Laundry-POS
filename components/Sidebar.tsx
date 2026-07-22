"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { LogOut } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Users,
  CreditCard,
  Boxes,
  Database,
  Settings,
  Waves,
  Store,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/access", label: "Access Control", icon: ShieldCheck },
  { href: "/users", label: "Users", icon: Users },
  { href: "/plans", label: "Plans & Billing", icon: CreditCard },
  { href: "/modules", label: "POS Modules", icon: Boxes },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAuth();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-slate-800 bg-slate-900">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Waves className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">LaundryPOS</div>
          <div className="text-[11px] font-medium text-slate-400">Control Plane</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <Link href="/pos" className="flex items-center gap-3 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700">
          <Store className="h-4 w-4" />
          Open POS app
        </Link>
      </div>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">ID</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{session?.name ?? "Idiosol Admin"}</div>
            <div className="truncate text-[11px] text-slate-400">{session?.email ?? "pa@healthandlife.com.au"}</div>
          </div>
          <button onClick={() => { logout(); router.replace("/login"); }} title="Sign out" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
