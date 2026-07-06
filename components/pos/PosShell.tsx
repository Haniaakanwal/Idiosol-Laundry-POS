"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { useAuth } from "@/lib/auth-store";
import { isFeatureOn } from "@/lib/catalog";
import { FeatureKey } from "@/lib/types";
import {
  LayoutDashboard, PlusCircle, ClipboardList, Users, Building2, Shirt,
  CreditCard, BarChart3, Receipt, Megaphone, LogOut, ArrowLeft, ChevronDown,
  MoreVertical, History, FileText,
} from "lucide-react";
import { StatusBadge } from "@/components/ui";

const NAV: { href: string; label: string; icon: any; feature?: FeatureKey | FeatureKey[] }[] = [
  { href: "/pos", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos/new", label: "New Order", icon: PlusCircle, feature: "pos" },
  { href: "/pos/orders", label: "Orders", icon: ClipboardList, feature: "orders" },
  { href: "/pos/customers", label: "Customers", icon: Users, feature: "customers" },
  { href: "/pos/business", label: "Business Accounts", icon: Building2, feature: "business" },
  { href: "/pos/services", label: "Services & Pricing", icon: Shirt, feature: "services" },
  { href: "/pos/payments", label: "Payments", icon: CreditCard, feature: "payments" },
  { href: "/pos/reports", label: "Reports", icon: BarChart3, feature: "reports" },
  { href: "/pos/vat", label: "VAT Returns", icon: Receipt, feature: "vat" },
  { href: "/pos/marketing", label: "Marketing", icon: Megaphone, feature: ["sms", "whatsapp", "promotions"] },
];

export function PosShell({ children }: { children: React.ReactNode }) {
  const { tenants, ready } = useStore();
  const pos = usePos();
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isStaff = session?.role === "staff";

  // Staff are locked to their own tenant — force the active client to match.
  useEffect(() => {
    if (isStaff && session && pos.ready && pos.activeClientId !== session.tenantId) {
      pos.setActiveClient(session.tenantId);
    }
  }, [isStaff, session, pos.ready, pos.activeClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const tenant = tenants.find((t) => t.id === pos.activeClientId);

  if (!ready || !pos.ready) return <div className="p-10 text-sm text-slate-400">Loading…</div>;

  // Admin with no client selected → show picker. (Staff are auto-assigned.)
  if (!tenant) return isStaff ? <div className="p-10 text-sm text-slate-400">Loading…</div> : <ClientPicker />;

  function signOut() {
    logout();
    router.replace("/login");
  }

  const enabled = (f?: FeatureKey | FeatureKey[]) => {
    if (!f) return true;
    const keys = Array.isArray(f) ? f : [f];
    return keys.some((k) => isFeatureOn(tenant.plan, tenant.featureOverrides, k));
  };
  const nav = NAV.filter((n) => enabled(n.feature));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            {tenant.name.slice(0, 1)}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">{tenant.name}</div>
            <div className="text-[11px] text-slate-400">{tenant.slug}.laundrypos.app · POS</div>
          </div>
          <span className="ml-2"><StatusBadge status={tenant.status} /></span>
        </div>
        <div className="flex items-center gap-2">
          <ActionsMenu enabled={enabled} />
          {!isStaff && <ClientSwitcher />}
          <div className="hidden text-right sm:block">
            <div className="text-xs font-medium text-slate-700">{session?.name}</div>
            <div className="text-[11px] text-slate-400">{isStaff ? (session as any).userRole : "Platform admin"}</div>
          </div>
          {isStaff ? (
            <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          ) : (
            <Link href="/clients" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Link>
          )}
        </div>
      </header>

      <div className="flex">
        {/* side nav */}
        <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-slate-200 bg-white px-3 py-4 print:hidden">
          <nav className="space-y-0.5">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== "/pos" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-slate-100 pt-4">
            {isStaff ? (
              <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            ) : (
              <button onClick={() => { pos.setActiveClient(null); router.push("/clients"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
                <LogOut className="h-4 w-4" /> Back to admin
              </button>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

function ActionsMenu({ enabled }: { enabled: (f?: FeatureKey | FeatureKey[]) => boolean }) {
  const [open, setOpen] = useState(false);
  const items = [
    { href: "/pos/new", label: "New Order", icon: PlusCircle, feature: "pos" as FeatureKey },
    { href: "/pos/orders", label: "Order History", icon: History, feature: "orders" as FeatureKey },
    { href: "/pos/counter-report", label: "Counter Report", icon: FileText, feature: "reports" as FeatureKey },
  ].filter((i) => enabled(i.feature));

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} onBlur={() => setTimeout(() => setOpen(false), 150)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
        <MoreVertical className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {items.map((i) => {
            const Icon = i.icon;
            return (
              <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <Icon className="h-4 w-4 text-slate-400" /> {i.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClientSwitcher() {
  const { tenants } = useStore();
  const pos = usePos();
  const live = tenants.filter((t) => t.status !== "churned");
  return (
    <div className="relative">
      <select
        value={pos.activeClientId ?? ""}
        onChange={(e) => pos.setActiveClient(e.target.value)}
        className="appearance-none rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none"
      >
        {live.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function ClientPicker() {
  const { tenants } = useStore();
  const pos = usePos();
  const router = useRouter();
  const live = tenants.filter((t) => t.status !== "churned");
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-xl font-semibold text-slate-900">Open a client’s POS</h1>
      <p className="mt-1 text-sm text-slate-500">Choose which laundry to sign in as. You can switch or return to the admin console at any time.</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {live.map((t) => (
          <button key={t.id} onClick={() => { pos.setActiveClient(t.id); router.push("/pos"); }} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">{t.name.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0">
              <div className="truncate font-medium text-slate-900">{t.name}</div>
              <div className="text-xs text-slate-400">{t.country}</div>
            </div>
          </button>
        ))}
      </div>
      <Link href="/dashboard" className="mt-6 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to admin console</Link>
    </div>
  );
}
