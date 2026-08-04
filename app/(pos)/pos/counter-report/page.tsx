"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money, num } from "@/lib/format";
import { Card, Button, inputCls } from "@/components/ui";
import { Printer, Eye } from "lucide-react";

interface CounterReportResp {
  cash: number; card: number; eft: number; acp: number; cashTotal: number;
  totalOrders: number; salesAmount: number; discount: number; tax: number;
  grandTotal: number; received: number; credit: number; deliveredItems: number;
}
const EMPTY: CounterReportResp = { cash: 0, card: 0, eft: 0, acp: 0, cashTotal: 0, totalOrders: 0, salesAmount: 0, discount: 0, tax: 0, grandTotal: 0, received: 0, credit: 0, deliveredItems: 0 };

// Counter Cash Report — cash-received + order/sales/tax rollup over a date range,
// mirroring the idiosol "Counter Report" print-out.
export default function CounterReportPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;

  const [from, setFrom] = useState("2026-06-01");
const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [range, setRange] = useState<{ from: string; to: string }>({ from: "2026-06-01", to: new Date().toISOString().slice(0, 10) });

  // Computed server-side (see /api/reports/counter) — sums/counts run in SQL
  // instead of loading every order and payment for the tenant into the browser.
  const [r, setR] = useState<CounterReportResp>(EMPTY);
  const [loading, setLoading] = useState(false);
  const printPendingRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/reports/counter?tenantId=${t.id}&from=${range.from}&to=${range.to}`)
      .then((res) => (res.ok ? res.json() : EMPTY))
      .then((data) => { if (!cancelled) setR(data); })
      .catch(() => { if (!cancelled) setR(EMPTY); })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        if (printPendingRef.current) { printPendingRef.current = false; window.print(); }
      });
    return () => { cancelled = true; };
  }, [t.id, range]);

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
              <Button onClick={() => { printPendingRef.current = true; setRange({ from, to }); }}><Printer className="h-4 w-4" /> Generate &amp; print</Button>
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
            {loading && <div className="mt-2 text-center text-xs text-slate-400 print:hidden">Loading…</div>}

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