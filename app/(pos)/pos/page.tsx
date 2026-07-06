"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { isFeatureOn } from "@/lib/catalog";
import { money, num } from "@/lib/format";
import { Card, Button, Badge } from "@/components/ui";
import { OrderStatusBadge } from "@/components/pos/bits";
import { PlusCircle, ClipboardList, Wallet, PackageCheck, Clock } from "lucide-react";

export default function PosDashboard() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const orders = pos.ordersFor(t.id);
  const cur = t.currency;

  const collected = orders.reduce((s, o) => s + o.paid, 0);
  const outstanding = orders.reduce((s, o) => s + o.balance, 0);
  const ready = orders.filter((o) => o.status === "Ready");
  const active = orders.filter((o) => o.status === "Job Order");
  const canPOS = isFeatureOn(t.plan, t.featureOverrides, "pos");

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">{t.name} — {t.branches} {t.branches === 1 ? "branch" : "branches"}</p>
        </div>
        {canPOS && <Link href="/pos/new"><Button><PlusCircle className="h-4 w-4" /> New order</Button></Link>}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={ClipboardList} tone="brand" label="Open orders" value={num(active.length)} sub={`${orders.length} total`} />
        <Kpi icon={PackageCheck} tone="green" label="Ready for pickup" value={num(ready.length)} sub="Awaiting collection" />
        <Kpi icon={Wallet} tone="violet" label="Collected" value={money(collected, cur)} sub="All-time payments" />
        <Kpi icon={Clock} tone="amber" label="Outstanding" value={money(outstanding, cur)} sub="Unpaid balances" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">Recent orders</h2>
            <Link href="/pos/orders" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-2.5">Ref</th><th className="px-4 py-2.5">Customer</th><th className="px-4 py-2.5">Total</th><th className="px-4 py-2.5">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {orders.slice(0, 6).map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-2.5"><Link href={`/pos/orders/${o.id}`} className="font-mono text-xs font-medium text-brand-600 hover:underline">{o.reference}</Link></td>
                  <td className="px-4 py-2.5 text-slate-700">{o.customerName}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{money(o.total, cur)}</td>
                  <td className="px-4 py-2.5"><OrderStatusBadge status={o.status} /></td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">No orders yet. Create the first one.</td></tr>}
            </tbody>
          </table>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-sm font-semibold text-slate-900">Ready for pickup</h2></div>
          {ready.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Nothing waiting.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ready.map((o) => (
                <li key={o.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <Link href={`/pos/orders/${o.id}`} className="text-sm font-medium text-slate-900 hover:text-brand-600">{o.customerName}</Link>
                    <div className="text-xs text-slate-400">{o.reference} · {o.items.length} items</div>
                  </div>
                  {o.balance > 0 ? <Badge tone="amber">{money(o.balance, cur)} due</Badge> : <Badge tone="green">paid</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: string }) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600", green: "bg-emerald-50 text-emerald-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </Card>
  );
}
