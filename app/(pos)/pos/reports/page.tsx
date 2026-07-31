"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money, num } from "@/lib/format";
import { PAYMENT_TYPES, SERVICE_TYPES } from "@/lib/pos";
import { Card, inputCls } from "@/components/ui";
import { ChevronRight, ChevronDown, Printer } from "lucide-react";
import { useEffect } from "react";


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

  const [printKey, setPrintKey] = useState<string | null>(null);
  function printReport(key: string) {
    setOpen(key);
    setPrintKey(key);
  }
  useEffect(() => {
    if (!printKey) return;
    const timer = setTimeout(() => window.print(), 80);
    function reset() { setPrintKey(null); }
    window.addEventListener("afterprint", reset);
    return () => { clearTimeout(timer); window.removeEventListener("afterprint", reset); };
  }, [printKey]);

  // --- Daily Cash Report ---
  const [dcFrom, setDcFrom] = useState("2026-01-01");
  const [dcTo, setDcTo] = useState(todayIso);
  const [dcType, setDcType] = useState<"All" | (typeof PAYMENT_TYPES)[number]>("All");
  const [dcApplied, setDcApplied] = useState(false);

  const dcRows = !dcApplied ? [] : orders
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
  const [rvApplied, setRvApplied] = useState(false);

  const rvItems = !rvApplied ? [] : orders
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
  const [joApplied, setJoApplied] = useState(false);
  const joRows = !joApplied ? [] : orders
    .filter((o) => o.date >= joFrom && o.date <= joTo)
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Top Services ---
  const [tsFrom, setTsFrom] = useState("2026-01-01");
  const [tsTo, setTsTo] = useState(todayIso);
  const [tsApplied, setTsApplied] = useState(false);
  const svcMap = new Map<string, number>();
  if (tsApplied) {
    for (const o of orders.filter((o) => o.date >= tsFrom && o.date <= tsTo)) {
      for (const it of o.items) svcMap.set(it.serviceName, (svcMap.get(it.serviceName) ?? 0) + it.qty);
    }
  }
 const topSvc = Array.from(svcMap.entries()).sort((a, b) => b[1] - a[1]);
  const maxSvc = Math.max(1, ...topSvc.map((s) => s[1]));

  // --- VAT Reports ---
  const [vatFrom, setVatFrom] = useState("2026-01-01");
  const [vatTo, setVatTo] = useState(todayIso);
  const [vatApplied, setVatApplied] = useState(false);
  const vatRows = !vatApplied ? [] : orders
    .filter((o) => o.date >= vatFrom && o.date <= vatTo && (o.tax ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const vatTotals = vatRows.reduce(
    (s, o) => {
      s.taxable += o.sub - o.discount;
      s.vat += o.tax ?? 0;
      s.total += o.total;
      return s;
    },
    { taxable: 0, vat: 0, total: 0 }
  );

  return (
    <>
     <h1 className={`mb-5 text-xl font-semibold text-slate-900 ${printKey ? "print:hidden" : ""}`}>Reports</h1>

      <div className={`mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 ${printKey ? "print:hidden" : ""}`}>
        <Stat label="Gross sales" value={money(gross, cur)} />
        <Stat label="Collected" value={money(collected, cur)} tone="text-emerald-600" />
        <Stat label="Outstanding" value={money(outstanding, cur)} tone="text-amber-600" />
      </div>

      <div className="space-y-3">
       <ReportSection
          title="Daily Cash"
          open={open === "dailyCash"}
          onToggle={() => toggle("dailyCash")}
          onPrint={() => printReport("dailyCash")}
          printMode={!printKey ? "none" : printKey === "dailyCash" ? "this" : "other"}
          printSubtitle={`${dcFrom} to ${dcTo} · ${dcType}`}
        >
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
            <button onClick={() => setDcApplied(true)} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Apply</button>
          </div>
          {!dcApplied ? (
            <p className="py-6 text-center text-sm text-slate-400">Set your filters and click Apply to load this report.</p>
          ) : (
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
          )}
        </ReportSection>

  <ReportSection
          title="Receiving"
          open={open === "receiving"}
          onToggle={() => toggle("receiving")}
          onPrint={() => printReport("receiving")}
          printMode={!printKey ? "none" : printKey === "receiving" ? "this" : "other"}
          printSubtitle={`${rvFrom} to ${rvTo} · ${rvService}`}
        >
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
            <button onClick={() => setRvApplied(true)} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Apply</button>
          </div>
          {!rvApplied ? (
            <p className="py-6 text-center text-sm text-slate-400">Set your filters and click Apply to load this report.</p>
          ) : (
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
          )}
        </ReportSection>

<ReportSection
          title="Job Order"
          open={open === "jobOrder"}
          onToggle={() => toggle("jobOrder")}
          onPrint={() => printReport("jobOrder")}
          printMode={!printKey ? "none" : printKey === "jobOrder" ? "this" : "other"}
          printSubtitle={`${joFrom} to ${joTo}`}
        >
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div><div className="mb-1 text-xs text-slate-400">Date From</div><input type="date" value={joFrom} onChange={(e) => setJoFrom(e.target.value)} className={inputCls} /></div>
            <div><div className="mb-1 text-xs text-slate-400">Date To</div><input type="date" value={joTo} onChange={(e) => setJoTo(e.target.value)} className={inputCls} /></div>
            <button onClick={() => setJoApplied(true)} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Apply</button>
          </div>
          {!joApplied ? (
            <p className="py-6 text-center text-sm text-slate-400">Set your filters and click Apply to load this report.</p>
          ) : (
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
          )}
        </ReportSection>

 <ReportSection
          title="Top Services"
          open={open === "topServices"}
          onToggle={() => toggle("topServices")}
          onPrint={() => printReport("topServices")}
          printMode={!printKey ? "none" : printKey === "topServices" ? "this" : "other"}
          printSubtitle={`${tsFrom} to ${tsTo}`}
        >
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div><div className="mb-1 text-xs text-slate-400">Date From</div><input type="date" value={tsFrom} onChange={(e) => setTsFrom(e.target.value)} className={inputCls} /></div>
            <div><div className="mb-1 text-xs text-slate-400">Date To</div><input type="date" value={tsTo} onChange={(e) => setTsTo(e.target.value)} className={inputCls} /></div>
            <button onClick={() => setTsApplied(true)} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Apply</button>
          </div>
          {!tsApplied ? (
            <p className="py-6 text-center text-sm text-slate-400">Set your filters and click Apply to load this report.</p>
          ) : (
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
          )}
        </ReportSection>

  <ReportSection
          title="VAT Reports"
          open={open === "vat"}
          onToggle={() => toggle("vat")}
          onPrint={() => printReport("vat")}
          printMode={!printKey ? "none" : printKey === "vat" ? "this" : "other"}
          printSubtitle={`${vatFrom} to ${vatTo}`}
        >
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div><div className="mb-1 text-xs text-slate-400">Date From</div><input type="date" value={vatFrom} onChange={(e) => setVatFrom(e.target.value)} className={inputCls} /></div>
            <div><div className="mb-1 text-xs text-slate-400">Date To</div><input type="date" value={vatTo} onChange={(e) => setVatTo(e.target.value)} className={inputCls} /></div>
            <button onClick={() => setVatApplied(true)} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Apply</button>
          </div>
          {!vatApplied ? (
            <p className="py-6 text-center text-sm text-slate-400">Set your filters and click Apply to load this report.</p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Order #</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3 text-right">Taxable Amount</th>
                  <th className="py-2 pr-3 text-right">VAT Rate</th>
                  <th className="py-2 pr-3 text-right">VAT Amount</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vatRows.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 pr-3">{o.reference}</td>
                    <td className="py-2 pr-3">{o.date}</td>
                    <td className="py-2 pr-3">{o.customerName}</td>
                    <td className="py-2 pr-3 text-right">{money(o.sub - o.discount, cur)}</td>
                    <td className="py-2 pr-3 text-right">{(o as any).taxRate ?? 0}%</td>
                    <td className="py-2 pr-3 text-right">{money(o.tax ?? 0, cur)}</td>
                    <td className="py-2 text-right font-medium">{money(o.total, cur)}</td>
                  </tr>
                ))}
                {vatRows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-slate-400">No VAT-applicable orders in this range.</td></tr>}
              </tbody>
              {vatRows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold text-slate-900">
                    <td colSpan={3} className="py-2 pr-3 text-right">Total</td>
                    <td className="py-2 pr-3 text-right">{money(vatTotals.taxable, cur)}</td>
                    <td></td>
                    <td className="py-2 pr-3 text-right">{money(vatTotals.vat, cur)}</td>
                    <td className="py-2 text-right">{money(vatTotals.total, cur)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          )}
        </ReportSection>
      </div>
    </>
  );
}

function ReportSection({
  title, open, onToggle, onPrint, printMode = "none", printSubtitle, children,
}: {
  title: string; open: boolean; onToggle: () => void; onPrint?: () => void;
  printMode?: "none" | "this" | "other"; printSubtitle?: string; children: React.ReactNode;
}) {
  return (
    <Card className={`overflow-hidden ${printMode === "other" ? "print:hidden" : ""}`}>
      <div className="flex items-center justify-between px-5 py-3.5">
        <button onClick={onToggle} className="flex flex-1 items-center gap-2 text-left hover:opacity-80 print:hidden">
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <span className="text-sm font-semibold text-slate-900">{title}</span>
        </button>
        {onPrint && (
          <button onClick={onPrint} title="Print this report" className="print:hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Printer className="h-4 w-4" />
          </button>
        )}
      </div>

      {printMode === "this" && (
        <div className="hidden border-t border-slate-100 px-5 pt-4 print:block">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {printSubtitle && <p className="mt-0.5 text-xs text-slate-500">{printSubtitle}</p>}
        </div>
      )}

      {open && <div className="border-t border-slate-100 p-5 print:border-t-0">{children}</div>}
    </Card>
  );
} 

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: string; tone?: string }) {
  return <Card className="p-5"><div className="text-sm font-medium text-slate-500">{label}</div><div className={`mt-2 text-2xl font-semibold tracking-tight ${tone}`}>{value}</div></Card>;
}