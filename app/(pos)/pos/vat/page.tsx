"use client";

import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money } from "@/lib/format";
import { Card, Badge, Button } from "@/components/ui";

// VAT returns computed from order tax — groups collected VAT by month.
export default function VatPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;
  const orders = pos.ordersFor(t.id).filter((o) => o.status !== "Cancelled");

  const byMonth = new Map<string, { taxable: number; vat: number; count: number }>();
  for (const o of orders) {
    const m = o.date.slice(0, 7);
    const cur0 = byMonth.get(m) ?? { taxable: 0, vat: 0, count: 0 };
    cur0.taxable += Math.max(0, o.sub - o.discount);
    cur0.vat += o.vat;
    cur0.count += 1;
    byMonth.set(m, cur0);
  }
  const periods = Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">VAT Returns</h1>
      <p className="mb-5 text-sm text-slate-500">Output VAT at {t.currency} · {orders.length ? `${orders[0].vatRate}%` : "5%"} — grouped by tax period</p>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3">Period</th><th className="px-4 py-3">Invoices</th><th className="px-4 py-3">Taxable</th><th className="px-4 py-3">Output VAT</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {periods.map(([m, v], i) => (
              <tr key={m} className="hover:bg-slate-50/60">
                <td className="px-5 py-3 font-medium text-slate-900">{m}</td>
                <td className="px-4 py-3 text-slate-600">{v.count}</td>
                <td className="px-4 py-3 text-slate-600">{money(Math.round(v.taxable * 100) / 100, cur)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{money(Math.round(v.vat * 100) / 100, cur)}</td>
                <td className="px-4 py-3"><Badge tone={i === 0 ? "amber" : "green"}>{i === 0 ? "Open" : "Filed"}</Badge></td>
                <td className="px-4 py-3 text-right">{i === 0 ? <Button size="sm" variant="secondary">Prepare return</Button> : <span className="text-xs text-slate-400">Submitted</span>}</td>
              </tr>
            ))}
            {periods.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No taxable sales yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
}
