import { TenantStatus } from "./types";

export function money(n: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

export function num(n: number): string {
  return n.toLocaleString("en-US");
}

export function mb(n: number): string {
  if (n >= 1024) return `${(n / 1024).toFixed(1)} GB`;
  return `${n} MB`;
}

export function dateLabel(iso?: string): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  return d;
}

// Days until an ISO date, relative to the app's fixed "today" (2026-07-03).
export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const today = Date.parse("todayStr()");
  const target = Date.parse(iso.slice(0, 10));
  if (Number.isNaN(target)) return null;
  return Math.round((target - today) / 86400000);
}

export const STATUS_STYLES: Record<TenantStatus, { label: string; cls: string; dot: string }> = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  trial: { label: "Trial", cls: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  suspended: { label: "Suspended", cls: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500" },
  churned: { label: "Churned", cls: "bg-slate-100 text-slate-500 ring-slate-500/20", dot: "bg-slate-400" },
};
