"use client";

import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money, num } from "@/lib/format";
import { PAYMENT_TYPES } from "@/lib/pos";
import { Card, Progress } from "@/components/ui";

export default function ReportsPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;
  const orders = pos.ordersFor(t.id);
  const services = pos.servicesFor(t.id);

  const gross = orders.reduce((s, o) => s + o.total, 0);
  const collected = orders.reduce((s, o) => s + o.paid, 0);
  const outstanding = orders.reduce((s, o) => s + o.balance, 0);


  // by payment type
  const byType = PAYMENT_TYPES.map((pt) => ({ pt, amt: orders.flatMap((o) => o.payments).filter((p) => p.type === pt).reduce((s, p) => s + p.amount, 0) }));
  const maxType = Math.max(1, ...byType.map((b) => b.amt));

  // revenue by day
  const dayMap = new Map<string, number>();
  for (const o of orders) dayMap.set(o.date, (dayMap.get(o.date) ?? 0) + o.total);
  const days = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDay = Math.max(1, ...days.map((d) => d[1]));

  // top services by qty
  const svcMap = new Map<string, number>();
  for (const o of orders) for (const it of o.items) svcMap.set(it.serviceName, (svcMap.get(it.serviceName) ?? 0) + it.qty);
  const topSvc = Array.from(svcMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxSvc = Math.max(1, ...topSvc.map((s) => s[1]));

  return (
    <>
      <h1 className="mb-5 text-xl font-semibold text-slate-900">Reports</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Gross sales" value={money(gross, cur)} />
        <Stat label="Collected" value={money(collected, cur)} tone="text-emerald-600" />
        <Stat label="Outstanding" value={money(outstanding, cur)} tone="text-amber-600" />
    
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Revenue by day</h2>
          <div className="space-y-3">
            {days.map(([d, v]) => (
              <div key={d}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{d}</span><span className="font-medium text-slate-700">{money(v, cur)}</span></div>
                <Progress value={v} max={maxDay} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Collections by method</h2>
          <div className="space-y-3">
            {byType.map(({ pt, amt }) => (
              <div key={pt}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{pt}</span><span className="font-medium text-slate-700">{money(amt, cur)}</span></div>
                <Progress value={amt} max={maxType} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Top garments (by quantity)</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topSvc.map(([name, q]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{name}</span><span className="font-medium text-slate-700">{num(q)}</span></div>
                <Progress value={q} max={maxSvc} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: string; tone?: string }) {
  return <Card className="p-5"><div className="text-sm font-medium text-slate-500">{label}</div><div className={`mt-2 text-2xl font-semibold tracking-tight ${tone}`}>{value}</div></Card>;
}
