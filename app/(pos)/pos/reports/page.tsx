"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money, num } from "@/lib/format";
import { PAYMENT_TYPES, SERVICE_TYPES } from "@/lib/pos";
import { Card, inputCls } from "@/components/ui";
import { ChevronRight, ChevronDown, Printer } from "lucide-react";

interface SummaryResp {
  gross: number;
  collected: number;
  outstanding: number;
}

interface DailyCashRow {
  id: string;
  ref: string | null;
  orderReference: string;
  date: string;
  customerName: string;
  type: string;
  amount: number;
  vatShare: number;
}
interface DailyCashResp {
  rows: DailyCashRow[];
  totals: { amount: number; vat: number; total: number };
}

interface ReceivingGroup {
  serviceType: string;
  items: { serviceType: string; label: string; qty: number }[];
}
interface ReceivingResp {
  groups: ReceivingGroup[];
  total: number;
}

interface JobOrderRow {
  id: string;
  reference: string;
  date: string;
  customerName: string;
  status: string;
  itemsQty: number;
  total: number;
  paid: number;
  balance: number;
}

interface VatRow {
  id: string;
  reference: string;
  date: string;
  customerName: string;
  sub: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
}
interface VatResp {
  rows: VatRow[];
  totals: { taxable: number; vat: number; total: number };
}

export default function ReportsPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;

  // --- Top-line stats (all-time Gross/Collected/Outstanding) ---
  // Computed server-side via SQL SUM, not by downloading every order and
  // reducing in the browser — stays fast regardless of order count.
  const [summary, setSummary] = useState<SummaryResp | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/summary?tenantId=${t.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [t.id]);
  const gross = summary?.gross ?? 0;
  const collected = summary?.collected ?? 0;
  const outstanding = summary?.outstanding ?? 0;

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

  function reportUrl(kind: string, params: Record<string, string>) {
    const qs = new URLSearchParams({ tenantId: t.id, kind, ...params });
    return `/api/orders/reports?${qs.toString()}`;
  }

  // --- Daily Cash Report ---
  const [dcFrom, setDcFrom] = useState("2026-01-01");
  const [dcTo, setDcTo] = useState(todayIso);
  const [dcType, setDcType] = useState<"All" | (typeof PAYMENT_TYPES)[number]>("All");
  const [dcApplied, setDcApplied] = useState(false);
  const [dcLoading, setDcLoading] = useState(false);
  const [dcData, setDcData] = useState<DailyCashResp | null>(null);
  function applyDailyCash() {
    setDcApplied(true);
    setDcLoading(true);
    fetch(reportUrl("dailyCash", { from: dcFrom, to: dcTo, type: dcType }))
      .then((r) => (r.ok ? r.json() : null))
      .then(setDcData)
      .catch(() => setDcData(null))
      .finally(() => setDcLoading(false));
  }
  const dcRows = dcData?.rows ?? [];
  const dcTotals = dcData?.totals ?? { amount: 0, vat: 0, total: 0 };

  // --- Receiving Report ---
  const [rvFrom, setRvFrom] = useState("2026-01-01");
  const [rvTo, setRvTo] = useState(todayIso);
  const [rvService, setRvService] = useState<"All" | (typeof SERVICE_TYPES)[number]>("All");
  const [rvApplied, setRvApplied] = useState(false);
  const [rvLoading, setRvLoading] = useState(false);
  const [rvData, setRvData] = useState<ReceivingResp | null>(null);
  function applyReceiving() {
    setRvApplied(true);
    setRvLoading(true);
    fetch(reportUrl("receiving", { from: rvFrom, to: rvTo, serviceType: rvService }))
      .then((r) => (r.ok ? r.json() : null))
      .then(setRvData)
      .catch(() => setRvData(null))
      .finally(() => setRvLoading(false));
  }
  const rvGroups = rvData?.groups ?? [];
  const rvTotal = rvData?.total ?? 0;

  // --- Job Order Report ---
  const [joFrom, setJoFrom] = useState("2026-01-01");
  const [joTo, setJoTo] = useState(todayIso);
  const [joApplied, setJoApplied] = useState(false);
  const [joLoading, setJoLoading] = useState(false);
  const [joRows, setJoRows] = useState<JobOrderRow[]>([]);
  function applyJobOrder() {
    setJoApplied(true);
    setJoLoading(true);
    fetch(reportUrl("jobOrder", { from: joFrom, to: joTo }))
      .then((r) => (r.ok ? r.json() : { rows: [] }))
      .then((data) => setJoRows(data.rows ?? []))
      .catch(() => setJoRows([]))
      .finally(() => setJoLoading(false));
  }

  // --- Top Services ---
  const [tsFrom, setTsFrom] = useState("2026-01-01");
  const [tsTo, setTsTo] = useState(todayIso);
  const [tsApplied, setTsApplied] = useState(false);
  const [tsLoading, setTsLoading] = useState(false);
  const [topSvc, setTopSvc] = useState<[string, number][]>([]);
  function applyTopServices() {
    setTsApplied(true);
    setTsLoading(true);
    fetch(reportUrl("topServices", { from: tsFrom, to: tsTo }))
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setTopSvc(data.items ?? []))
      .catch(() => setTopSvc([]))
      .finally(() => setTsLoading(false));
  }
  const maxSvc = Math.max(1, ...topSvc.map((s) => s[1]));

  // --- VAT Reports ---
  const [vatFrom, setVatFrom] = useState("2026-01-01");
  const [vatTo, setVatTo] = useState(todayIso);
  const [vatApplied, setVatApplied] = useState(false);
  const [vatLoading, setVatLoading] = useState(false);
  const [vatData, setVatData] = useState<VatResp | null>(null);
  function applyVat() {
    setVatApplied(true);
    setVatLoading(true);
    fetch(reportUrl("vat", { from: vatFrom, to: vatTo }))
      .then((r) => (r.ok ? r.json() : null))
      .then(setVatData)
      .catch(() => setVatData(null))
      .finally(() => setVatLoading(false));
  }
  const vatRows = vatData?.rows ?? [];
  const vatTotals = vatData?.totals ?? { taxable: 0, vat: 0, total: 0 };

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
            <button onClick={applyDailyCash} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Apply</button>
          </div>
          {!dcApplied ? (
            <p className="py-6 text-center text-sm text-slate-400">Set your filters and click Apply to load this report.</p>
          ) : dcLoading ? (
            <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
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
                {dcRows.map((row, i) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-3 text-slate-500">{i + 1}</td>
                    <td className="py-2 pr-3">{row.ref ?? "—"}</td>
                    <td className="py-2 pr-3">{row.orderReference}</td>
                    <td className="py-2 pr-3">{row.date}</td>
                    <td className="py-2 pr-3">{row.customerName}</td>
                    <td className="py-2 pr-3">{row.type}</td>
                    <td className="py-2 pr-3 text-right">{money(row.amount - row.vatShare, cur)}</td>
                    <td className="py-2 pr-3 text-right">{money(row.vatShare, cur)}</td>
                    <td className="py-2 pr-3 text-right font-medium">{money(row.amount, cur)}</td>
                    <td className="py-2 text-right text-slate-400">—</td>
                  </tr>
                ))}
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
            <button onClick={applyReceiving} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Apply</button>
          </div>
          {!rvApplied ? (
            <p className="py-6 text-center text-sm text-slate-400">Set your filters and click Apply to load this report.</p>
          ) : rvLoading ? (
            <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="py-2">Service</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rvGroups.map((group) => (
                <>
                  <tr key={group.serviceType} className="border-b border-slate-100 bg-slate-50/60">
                    <td colSpan={2} className="py-1.5 px-1 text-xs font-semibold text-slate-700">{group.serviceType}</td>
                  </tr>
                  {group.items.map((it) => (
                    <tr key={it.label} className="border-b border-slate-50">
                      <td className="py-1.5 pl-3 text-slate-600">{it.label}</td>
                      <td className="py-1.5 text-right text-slate-700">{it.qty}</td>
                    </tr>
                  ))}
                </>
              ))}
              {rvGroups.length === 0 && <tr><td colSpan={2} className="py-6 text-center text-slate-400">No items in this range.</td></tr>}
            </tbody>
            {rvGroups.length > 0 && (
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
            <button onClick={applyJobOrder} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Apply</button>
          </div>
          {!joApplied ? (
            <p className="py-6 text-center text-sm text-slate-400">Set your filters and click Apply to load this report.</p>
          ) : joLoading ? (
            <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
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
                    <td className="py-2 pr-3 text-right">{o.itemsQty}</td>
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
            <button onClick={applyTopServices} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Apply</button>
          </div>
          {!tsApplied ? (
            <p className="py-6 text-center text-sm text-slate-400">Set your filters and click Apply to load this report.</p>
          ) : tsLoading ? (
            <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
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
            <button onClick={applyVat} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Apply</button>
          </div>
          {!vatApplied ? (
            <p className="py-6 text-center text-sm text-slate-400">Set your filters and click Apply to load this report.</p>
          ) : vatLoading ? (
            <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
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
                    <td className="py-2 pr-3 text-right">{o.taxRate}%</td>
                    <td className="py-2 pr-3 text-right">{money(o.tax, cur)}</td>
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
