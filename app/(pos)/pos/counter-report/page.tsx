"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money, num } from "@/lib/format";
import { Card, Button, inputCls } from "@/components/ui";
import { Printer, Eye } from "lucide-react";

// Counter Cash Report — cash-received + order/sales/tax rollup over a date range,
// mirroring the idiosol "Counter Report" print-out.
export default function CounterReportPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;
  const orders = pos.ordersFor(t.id);

  const [from, setFrom] = useState("2026-06-01");
  const [to, setTo] = useState("2026-07-03");
  const [range, setRange] = useState<{ from: string; to: string }>({ from: "2026-06-01", to: "2026-07-03" });

  const r = useMemo(() => {
    const inRange = orders.filter((o) => o.date >= range.from && o.date <= range.to && o.status !== "Cancelled");
    const pays = orders.flatMap((o) => o.payments).filter((p) => p.date >= range.from && p.date <= range.to);
    const byType = (ty: string) => pays.filter((p) => p.type === ty).reduce((s, p) => s + p.amount, 0);
    const cash = byType("Cash"), card = byType("Card"), eft = byType("EFT"), acp = 0;
    const delivered = inRange.filter((o) => o.status === "Delivered");
    return {
      cash, card, eft, acp, cashTotal: cash + card + eft + acp,
      totalOrders: inRange.length,
      salesAmount: round(inRange.reduce((s, o) => s + o.sub, 0)),
      discount: round(inRange.reduce((s, o) => s + o.discount, 0)),
      tax: round(inRange.reduce((s, o) => s + o.vat, 0)),
      grandTotal: round(inRange.reduce((s, o) => s + o.total, 0)),
      received: round(inRange.reduce((s, o) => s + o.paid, 0)),
      credit: round(inRange.reduce((s, o) => s + o.balance, 0)),
      deliveredItems: delivered.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0),
    };
  }, [orders, range]);

  return (
    <>
      <div className="mb-5 flex items-center justify-between print:hidden">
        <div><h1 className="text-xl font-semibold text-slate-900">Counter Cash Report</h1><p className="text-sm text-slate-500">Cash received &amp; order rollup for a date range</p></div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit p-5 print:hidden">
          <div className="space-y-4">
            <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Date from</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Date to</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></label>
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="secondary" onClick={() => setRange({ from, to })}><Eye className="h-4 w-4" /> Generate &amp; preview</Button>
              <Button onClick={() => { setRange({ from, to }); setTimeout(() => window.print(), 100); }}><Printer className="h-4 w-4" /> Generate &amp; print</Button>
            </div>
          </div>
        </Card>

        {/* printable report */}
        <Card className="p-8">
          <div className="mx-auto max-w-xl">
            <h2 className="text-center text-lg font-bold uppercase tracking-wide text-slate-900 underline">Report</h2>
            <div className="mt-1 text-center text-sm text-slate-500">{t.name}</div>
            <div className="mt-4 flex justify-between text-sm text-slate-600">
              <span>Date From : <b>{range.from}</b></span>
              <span>Date To : <b>{range.to}</b></span>
            </div>

            <Section title="Counter Sale (Cash Received)">
              <Line label="Credit Card (Receipt)" value={money(r.card, cur)} />
              <Line label="Cash" value={money(r.cash, cur)} />
              <Line label="EFT" value={money(r.eft, cur)} />
              <Line label="ACP" value={money(r.acp, cur)} />
              <Line label="Total" value={money(r.cashTotal, cur)} strong />
            </Section>

            <Section title="Orders Details">
              <Line label="Total Orders" value={num(r.totalOrders)} />
              <Line label="Total Order Sales Amount" value={money(r.salesAmount, cur)} />
              <Line label="Total Discount" value={money(r.discount, cur)} />
              <Line label="Total Tax" value={money(r.tax, cur)} />
              <Line label="Grand Total Amount" value={money(r.grandTotal, cur)} strong />
              <Line label="Total Amount Received On Orders" value={money(r.received, cur)} />
              <Line label="Credit Balance in Orders" value={money(r.credit, cur)} />
            </Section>

            <Section title="Delivered">
              <Line label="Total Delivered Items" value={num(r.deliveredItems)} />
            </Section>
          </div>
        </Card>
      </div>
    </>
  );
}

function round(n: number) { return Math.round(n * 100) / 100; }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="border-b border-slate-300 pb-1 text-center text-sm font-bold text-slate-800">{title}</div>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${strong ? "border-t border-slate-200 pt-1.5 font-semibold text-slate-900" : "text-slate-600"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
