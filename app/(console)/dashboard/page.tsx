"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { PLANS } from "@/lib/catalog";
import { money, num, dateLabel } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatusBadge, Progress } from "@/components/ui";
import { TrendingUp, Building2, Users, ShoppingCart, AlertTriangle, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { tenants, users, activity, ready } = useStore();
  if (!ready) return <Skeleton />;

  const active = tenants.filter((t) => t.status === "active");
  const trials = tenants.filter((t) => t.status === "trial");
  const suspended = tenants.filter((t) => t.status === "suspended");
  const mrr = tenants.reduce((s, t) => s + t.mrr, 0);
  const orders = tenants.reduce((s, t) => s + t.monthlyOrders, 0);

  const byPlan = PLANS.map((p) => ({
    plan: p,
    count: tenants.filter((t) => t.plan === p.id && t.status !== "churned").length,
  }));
  const maxPlan = Math.max(1, ...byPlan.map((b) => b.count));

  const attention = tenants.filter((t) => t.status === "suspended" || (t.status === "trial" && (t.trialEndsAt ?? "") <= "2026-07-12"));

  return (
    <>
      <PageHeader title="Overview" subtitle="Platform-wide health across every LaundryPOS client." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Building2} label="Active clients" value={num(active.length)} sub={`${trials.length} in trial · ${suspended.length} suspended`} tone="brand" />
        <Kpi icon={TrendingUp} label="Monthly recurring" value={money(mrr)} sub="Across all paid plans" tone="green" />
        <Kpi icon={ShoppingCart} label="Orders / 30 days" value={num(orders)} sub="POS transactions platform-wide" tone="violet" />
        <Kpi icon={Users} label="Total seats" value={num(users.length)} sub="Staff accounts provisioned" tone="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
            <Link href="/clients" className="text-xs font-medium text-brand-600 hover:text-brand-700">View clients</Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {activity.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                <EventDot kind={e.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700">
                    <Link href={`/clients/${e.tenantId}`} className="font-medium text-slate-900 hover:text-brand-600">{e.tenantName}</Link>{" "}
                    <span className="text-slate-500">— {e.message}</span>
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{dateLabel(e.at)}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Plan mix */}
        <Card>
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">Plan distribution</h2>
          </div>
          <div className="space-y-4 px-5 py-4">
            {byPlan.map(({ plan, count }) => (
              <div key={plan.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{plan.name}</span>
                  <span className="text-slate-500">{count} · {money(plan.priceMonthly)}/mo</span>
                </div>
                <Progress value={count} max={maxPlan} />
              </div>
            ))}
            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
              Every client shares one database; rows are isolated by <code className="rounded bg-white px-1 py-0.5 text-[11px] text-brand-700 ring-1 ring-slate-200">clientId</code>.
            </div>
          </div>
        </Card>
      </div>

      {/* Needs attention */}
      <Card className="mt-6">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">Needs attention</h2>
        </div>
        {attention.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400">Nothing needs attention right now.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {attention.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={t.status} />
                  <Link href={`/clients/${t.id}`} className="text-sm font-medium text-slate-900 hover:text-brand-600">{t.name}</Link>
                  <span className="text-xs text-slate-400">
                    {t.status === "suspended" ? "Payment failed" : `Trial ends ${dateLabel(t.trialEndsAt)}`}
                  </span>
                </div>
                <Link href={`/clients/${t.id}`} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: "brand" | "green" | "violet" | "amber" }) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </Card>
  );
}

function EventDot({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    signup: "bg-brand-500",
    upgrade: "bg-emerald-500",
    downgrade: "bg-slate-400",
    suspend: "bg-rose-500",
    reactivate: "bg-emerald-500",
    invite: "bg-violet-500",
    payment: "bg-emerald-500",
    login: "bg-slate-300",
  };
  return <span className={`h-2 w-2 shrink-0 rounded-full ${map[kind] ?? "bg-slate-300"}`} />;
}

function Skeleton() {
  return <div className="animate-pulse text-sm text-slate-400">Loading console…</div>;
}
