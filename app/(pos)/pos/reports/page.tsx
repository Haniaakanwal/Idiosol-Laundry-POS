"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money, num } from "@/lib/format";
import { PAYMENT_TYPES, SERVICE_TYPES } from "@/lib/pos";
import { Card, inputCls } from "@/components/ui";
import { ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;
  const orders = pos.ordersFor(t.id);

  const gross = orders.reduce((s, o) => s + o.total, 0);
  const collected = orders.reduce((s, o) => s + o.paid, 0);
  const outstanding = orders.reduce((s, o) => s + o.balance, 0);

  const todayIso = new Date().toISOString().slice(0, 10);

  const [open, setOpen] = useState<string | null>("dailyCash");
  function toggle(key: string) {
    setOpen((prev) => (prev === key ? null : key));
  }

  // --- Daily Cash Report ---
  const [dcFrom, setDcFrom] = useState("2026-01-01");
  const [dcTo, setDcTo] = useState(todayIso);
  const [dcType, setDcType] = useState<"All" | (typeof PAYMENT_TYPES)[number]>("All");

  const dcRows = orders
    .flatMap((o) => o.payments.map((p) => ({ order: o, payment: p })))
    .filter(({ payment }) => payment.date >= dcFrom && payment.date <= dcTo)
    .filter(({ payment }) => dcType === "All" || payment.type === dcType)
    .sort((a, b) => a.payment.date.localeCompare(b.payment.date));

  const dcTotals = dcRows.reduce(
    (s, { order, payment }) => {
      const vatShare = order.total > 0 ? (order.tax ?? 0) * (payment.amount / order.total) : 0;
      s.amount += payment.amount - vatShare;
      s.vat += vatShare;
      s.total += payment.amount;
      return s;
    },
    { amount: 0, vat: 0, total: 0 }
  );

  // --- Receiving Report ---
  const [rvFrom, setRvFrom] = useState("2026-01-01");
  const [rvTo, setRvTo] = useState(todayIso);
  const [rvService, setRvService] = useState<"All" | (typeof SERVICE_TYPES)[number]>("All");

  const rvItems = orders
    .filter((o) => o.date >= rvFrom && o.date <= rvTo)
    .flatMap((o) => o.items)
    .filter((it) => rvService === "All" || it.serviceType === rvService);

  const rvGroups = new Map<string, Map<string, number>>();
  for (const it of rvItems) {
    if (!rvGroups.has(it.serviceType)) rvGroups.set(it.serviceType, new Map());
    const g = rvGroups.get(it.serviceType)!;
    const label = `${it.serviceName}-${it.serviceType}`;
    g.set(label, (g.get(label) ?? 0) + it.qty);
  }
  const rvTotal = rvItems.reduce((s, it) => s + it.qty, 0);

  // --- Job Order Report ---
  const [joFrom, setJoFrom] = useState("2026-01-01");
  const [joTo, setJoTo] = useState(todayIso);
  const joRows = orders
    .filter((o) => o.date >= joFrom && o.date <= joTo)
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Top Services ---
  const [tsFrom, setTsFrom] = useState("2026-01-01");
  const [tsTo, setTsTo] = useState(todayIso);
  const svcMap = new Map<string, number>();
  for (const o of orders.filter((o) => o.date >= tsFrom && o.date <= tsTo)) {
    for (const it of o.items) svcMap.set(it.serviceName, (svcMap.get(it.serviceName) ?? 0) + it.qty);
  }
  const topSvc = Array.from(svcMap.entries()).sort((a, b) => b[1] - a[1]);
  const maxSvc = Math.max(1, ...topSvc.map((s) => s[1]));

  return (
    <>
      <h1 className="mb-5 text-xl font-semibold text-slate-900">Reports</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Gross sales" value={money(gross, cur)} />
        <Stat label="Collected" value={money(collected, cur)} tone="text-emerald-600" />
        <Stat label="Outstanding" value={money(outstanding, cur)} tone="text-amber-600" />
      </div>

      <div className="space-y-3">
        <ReportSection title="Daily Cash" open={open === "dailyCash"} onToggle={() => toggle("dailyCash")}>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div><div className="mb-1 text-xs text-slate-400">Date From</div><input type="date" value={dcFrom} onChange={(e) => setDcFrom(e.target.value)} className={inputCls} /></div>
            <div><div className="mb-1 text-xs text-slate-400">Date To</div><input type="date" value={dcTo} onChange={(e) => setDcTo(e.target.value)} className={inputCls} /></div>
            <div>
              <div className="mb-1 text-xs text-slate-400">Report Type</div>
              <select value={dcType} onChange={(e) => setDcType(e.target.value as any)} className={inputCls}>
                <option value="All">All</option>
                {PAYMENT_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Sr.</th>
                  <th className="py-2 pr-3">Invoice</th>
                  <th className="py-2 pr-3">Order #</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2 pr-3 text-right">VAT</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 text-right">Extra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dcRows.map(({ order, payment }, i) => {
                  const vatShare = order.total > 0 ? (order.tax ?? 0) * (payment.amount / order.total) : 0;
                  return (
                    <tr key={payment.id}>
                      <td className="py-2 pr-3 text-slate-500">{i + 1}</td>
                      <td className="py-2 pr-3">{payment.ref ?? "—"}</td>
                      <td className="py-2 pr-3">{order.reference}</td>
                      <td className="py-2 pr-3">{payment.date}</td>
                      <td className="py-2 pr-3">{order.customerName}</td>
                      <td className="py-2 pr-3">{payment.type}</td>
                      <td className="py-2 pr-3 text-right">{money(payment.amount - vatShare, cur)}</td>
                      <td className="py-2 pr-3 text-right">{money(vatShare, cur)}</td>
                      <td className="py-2 pr-3 text-right font-medium">{money(payment.amount, cur)}</td>
                      <td className="py-2 text-right text-slate-400">—</td>
                    </tr>
                  );
                })}
                {dcRows.length === 0 && <tr><td colSpan={10} className="py-6 text-center text-slate-400">No transactions in this range.</td></tr>}
              </tbody>
              {dcRows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold text-slate-900">
                    <td colSpan={6} className="py-2 pr-3 text-right">Total</td>
                    <td className="py-2 pr-3 text-right">{money(dcTotals.amount, cur)}</td>
                    <td className="py-2 pr-3 text-right">{money(dcTotals.vat, cur)}</td>
                    <td className="py-2 pr-3 text-right">{money(dcTotals.total, cur)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </ReportSection>

        <ReportSection title="Receiving" open={open === "receiving"} onToggle={() => toggle("receiving")}>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div><div className="mb-1 text-xs text-slate-400">Date</div><input type="date" value={rvFrom} onChange={(e) => setRvFrom(e.target.value)} className={inputCls} /></div>
            <div><div className="mb-1 text-xs text-slate-400">to</div><input type="date" value={rvTo} onChange={(e) => setRvTo(e.target.value)} className={inputCls} /></div>
            <div>
              <div className="mb-1 text-xs text-slate-400">Select Service</div>
              <select value={rvService} onChange={(e) => setRvService(e.target.value as any)} className={inputCls}>
                <option value="All">All</option>
                {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="py-2">Service</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(rvGroups.entries()).map(([type, items]) => (
                <>
                  <tr key={type} className="border-b border-slate-100 bg-slate-50/60">
                    <td colSpan={2} className="py-1.5 px-1 text-xs font-semibold text-slate-700">{type}</td>
                  </tr>
                  {Array.from(items.entries()).map(([label, qty]) => (
                    <tr key={label} className="border-b border-slate-50">
                      <td className="py-1.5 pl-3 text-slate-600">{label}</td>
                      <td className="py-1.5 text-right text-slate-700">{qty}</td>
                    </tr>
                  ))}
                </>
              ))}
              {rvGroups.size === 0 && <tr><td colSpan={2} className="py-6 text-center text-slate-400">No items in this range.</td></tr>}
            </tbody>
            {rvGroups.size > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold text-slate-900">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{rvTotal}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </ReportSection>

        <ReportSection title="Job Order" open={open === "jobOrder"} onToggle={() => toggle("jobOrder")}>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div><div className="mb-1 text-xs text-slate-400">Date From</div><input type="date" value={joFrom} onChange={(e) => setJoFrom(e.target.value)} className={inputCls} /></div>
            <div><div className="mb-1 text-xs text-slate-400">Date To</div><input type="date" value={joTo} onChange={(e) => setJoTo(e.target.value)} className={inputCls} /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Order #</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Items</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3 text-right">Paid</th>
                  <th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {joRows.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 pr-3">{o.reference}</td>
                    <td className="py-2 pr-3">{o.date}</td>
                    <td className="py-2 pr-3">{o.customerName}</td>
                    <td className="py-2 pr-3">{o.status}</td>
                    <td className="py-2 pr-3 text-right">{o.items.reduce((s, it) => s + it.qty, 0)}</td>
                    <td className="py-2 pr-3 text-right">{money(o.total, cur)}</td>
                    <td className="py-2 pr-3 text-right">{money(o.paid, cur)}</td>
                    <td className="py-2 text-right">{money(o.balance, cur)}</td>
                  </tr>
                ))}
                {joRows.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-slate-400">No orders in this range.</td></tr>}
              </tbody>
            </table>
          </div>
        </ReportSection>

        <ReportSection title="Top Services" open={open === "topServices"} onToggle={() => toggle("topServices")}>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div><div className="mb-1 text-xs text-slate-400">Date From</div><input type="date" value={tsFrom} onChange={(e) => setTsFrom(e.target.value)} className={inputCls} /></div>
            <div><div className="mb-1 text-xs text-slate-400">Date To</div><input type="date" value={tsTo} onChange={(e) => setTsTo(e.target.value)} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topSvc.map(([name, q]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{name}</span><span className="font-medium text-slate-700">{num(q)}</span></div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, Math.round((q / maxSvc) * 100))}%` }} />
                </div>
              </div>
            ))}
            {topSvc.length === 0 && <p className="col-span-full py-6 text-center text-sm text-slate-400">No items in this range.</p>}
          </div>
        </ReportSection>

        <ReportSection title="VAT Reports" open={open === "vat"} onToggle={() => toggle("vat")}>
          <p className="text-sm text-slate-500">
            Full VAT reporting lives on the dedicated{" "}
            <Link href="/pos/vat-returns" className="font-medium text-brand-600 hover:underline">VAT Returns</Link> page.
          </p>
        </ReportSection>
      </div>
    </>
  );
}

function ReportSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-5 py-3.5 text-left hover:bg-slate-50/60">
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        <span className="text-sm font-semibold text-slate-900">{title}</span>
      </button>
      {open && <div className="border-t border-slate-100 p-5">{children}</div>}
    </Card>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: string; tone?: string }) {
  return <Card className="p-5"><div className="text-sm font-medium text-slate-500">{label}</div><div className={`mt-2 text-2xl font-semibold tracking-tight ${tone}`}>{value}</div></Card>;
}