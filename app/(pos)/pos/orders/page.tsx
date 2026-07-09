"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money } from "@/lib/format";
import { ORDER_STATUSES, OrderStatus, DELIVERY_TYPES } from "@/lib/pos";
import { Card, Button, inputCls } from "@/components/ui";
import { OrderStatusBadge } from "@/components/pos/bits";
import { Search, PlusCircle, Wallet, PackageCheck, Truck, MessageSquare, X, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";


const STATUS_FILTERS: (OrderStatus | "All")[] = ["All", ...ORDER_STATUSES];

export default function OrdersPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;
  const all = pos.ordersFor(t.id);
const searchParams = useSearchParams();
const custFilter = searchParams.get("customerId");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "All">("All");
  const [paid, setPaid] = useState<"All" | "Paid" | "Balance">("All");
  const [delivery, setDelivery] = useState<"All" | (typeof DELIVERY_TYPES)[number]>("All");
  const [useDates, setUseDates] = useState(false);
  const [from, setFrom] = useState("2026-06-01");
  const [to, setTo] = useState("2026-07-03");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");

  const rows = useMemo(() => all.filter((o) => {
    if (custFilter && o.customerId !== custFilter) return false;
    if (status !== "All" && o.status !== status) return false;
    if (paid === "Paid" && o.balance > 0) return false;
    if (paid === "Balance" && o.balance <= 0) return false;
    if (delivery !== "All" && o.deliveryType !== delivery) return false;
    if (useDates && (o.date < from || o.date > to)) return false;
    if (q) { const s = q.toLowerCase(); return o.reference.toLowerCase().includes(s) || o.customerName.toLowerCase().includes(s) || o.customerPhone.includes(q); }
    return true;
  }), [all, status, paid, delivery, useDates, from, to, q]);

  const counts = (s: OrderStatus | "All") => (s === "All" ? all.length : all.filter((o) => o.status === s).length);
  const selectedRows = rows.filter((o) => sel.has(o.id));
  const selBalance = selectedRows.reduce((s, o) => s + o.balance, 0);
  const filteredBalance = rows.reduce((s, o) => s + o.balance, 0);
  const allSelected = rows.length > 0 && rows.every((o) => sel.has(o.id));

  function toggle(id: string) { setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleAll() { setSel(allSelected ? new Set() : new Set(rows.map((o) => o.id))); }
  function clearSel() { setSel(new Set()); }
  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 2600); }

  const ids = Array.from(sel);
  function payAll() { const n = selectedRows.filter((o) => o.balance > 0).length; pos.bulkPay(ids, "Cash"); flash(`Collected ${money(selBalance, cur)} across ${n} order${n === 1 ? "" : "s"} (Cash)`); clearSel(); }
  function readyAll() { pos.bulkStatus(ids, "Ready"); flash(`${ids.length} order${ids.length === 1 ? "" : "s"} marked Ready`); clearSel(); }
  function deliverAll() { pos.bulkStatus(ids, "Delivered"); flash(`${ids.length} order${ids.length === 1 ? "" : "s"} delivered`); clearSel(); }
  function sendSms(kind: string) { flash(`Queued ${kind} SMS to ${ids.length} customer${ids.length === 1 ? "" : "s"}`); }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div><h1 className="text-xl font-semibold text-slate-900">Orders</h1><p className="text-sm text-slate-500">Job order history · {all.length} orders</p></div>
        <Link href="/pos/new"><Button><PlusCircle className="h-4 w-4" /> New order</Button></Link>
      </div>

      {/* filters */}
      <Card className="mb-3 space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, customer, phone…" className={`${inputCls} pl-9`} />
          </div>
          <select value={paid} onChange={(e) => setPaid(e.target.value as any)} className={`${inputCls} w-auto`}>
            <option value="All">Paid status: All</option>
            <option value="Paid">Paid</option>
            <option value="Balance">Has balance</option>
          </select>
          <select value={delivery} onChange={(e) => setDelivery(e.target.value as any)} className={`${inputCls} w-auto`}>
            <option value="All">Delivery: All</option>
            {DELIVERY_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-600">
            <input type="checkbox" checked={useDates} onChange={(e) => setUseDates(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
            Search with dates
          </label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={!useDates} className={`${inputCls} w-auto ${!useDates ? "opacity-40" : ""}`} />
          <span className="text-slate-400">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={!useDates} className={`${inputCls} w-auto ${!useDates ? "opacity-40" : ""}`} />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${status === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {s} <span className="text-slate-400">{counts(s)}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* bulk action bar */}
      {sel.size > 0 && (
        <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 shadow-sm">
          <span className="text-sm font-semibold text-brand-800">{sel.size} selected</span>
          <span className="text-xs text-brand-600">· balance {money(selBalance, cur)}</span>
          <div className="flex-1" />
          <Button size="sm" onClick={payAll} disabled={selBalance <= 0}><Wallet className="h-4 w-4" /> Pay all</Button>
          <Button size="sm" variant="secondary" onClick={readyAll}><PackageCheck className="h-4 w-4" /> Mark ready</Button>
          <Button size="sm" variant="secondary" onClick={deliverAll}><Truck className="h-4 w-4" /> Deliver all</Button>
          <Button size="sm" variant="secondary" onClick={() => sendSms("Ready")}><MessageSquare className="h-4 w-4" /> Ready SMS</Button>
          <Button size="sm" variant="secondary" onClick={() => sendSms("Invoice")}><MessageSquare className="h-4 w-4" /> Invoice SMS</Button>
          <button onClick={clearSel} className="rounded-md p-1.5 text-brand-500 hover:bg-brand-100"><X className="h-4 w-4" /></button>
        </div>
      )}

      {toast && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <CheckCircle2 className="h-4 w-4" /> {toast}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 text-brand-600" /></th>
                <th className="px-3 py-3">Ref</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Deliv.</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((o) => (
                <tr key={o.id} className={`hover:bg-slate-50/60 ${sel.has(o.id) ? "bg-brand-50/40" : ""}`}>
                  <td className="px-4 py-3"><input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} className="h-4 w-4 rounded border-slate-300 text-brand-600" /></td>
                  <td className="px-3 py-3"><Link href={`/pos/orders/${o.id}`} className="font-mono text-xs font-medium text-brand-600 hover:underline">{o.reference}</Link></td>
                  <td className="px-4 py-3"><div className="font-medium text-slate-800">{o.customerName}</div><div className="text-xs text-slate-400">{o.customerPhone}</div></td>
                  <td className="px-4 py-3 text-slate-500">{o.date}</td>
                  <td className="px-4 py-3 text-slate-600">{o.deliveryType}</td>
                  <td className="px-4 py-3 text-slate-600">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{money(o.total, cur)}</td>
                  <td className="px-4 py-3 text-slate-600">{money(o.paid, cur)}</td>
                  <td className="px-4 py-3">{o.balance > 0 ? <span className="font-medium text-amber-600">{money(o.balance, cur)}</span> : <span className="text-emerald-600">Paid</span>}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={10} className="px-5 py-12 text-center text-sm text-slate-400">No orders match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5 text-sm">
          <span className="text-slate-500">{rows.length} order{rows.length === 1 ? "" : "s"}{useDates ? ` · ${from} → ${to}` : ""}</span>
          <span className="text-slate-600">Total balance <b className="text-amber-600">{money(filteredBalance, cur)}</b></span>
        </div>
      </Card>
    </>
  );
}
