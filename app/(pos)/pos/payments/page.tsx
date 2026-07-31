"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money } from "@/lib/format";
import { PAYMENT_TYPES } from "@/lib/pos";
import { Card, Badge, inputCls } from "@/components/ui";

export default function PaymentsPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;
  const orders = pos.ordersFor(t.id);
  const [type, setType] = useState("all");
const rows = useMemo(() => orders.flatMap((o) => o.payments.map((p) => ({ ...p, order: o }))).filter((r) => type === "all" || r.type === type).sort((a, b) => b.date.localeCompare(a.date)), [orders, type]);
const PAGE_SIZE = 50;                                                    // ← add
const [page, setPage] = useState(1);                                     // ← add
const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));      // ← add
const pagedRows = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]); // ← add
  const total = rows.reduce((s, r) => s + r.amount, 0);
useEffect(() => setPage(1), [type]);

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div><h1 className="text-xl font-semibold text-slate-900">Payments</h1><p className="text-sm text-slate-500">{rows.length} receipts · {money(total, cur)} collected</p></div>
        <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="all">All methods</option>
          {PAYMENT_TYPES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3">Receipt</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Amount</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
         {pagedRows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3 font-mono text-xs text-slate-600">{r.ref}</td>
                <td className="px-4 py-3 text-slate-500">{r.date}</td>
                <td className="px-4 py-3"><Link href={`/pos/orders/${r.order.id}`} className="font-mono text-xs text-brand-600 hover:underline">{r.order.reference}</Link></td>
                <td className="px-4 py-3 text-slate-700">{r.order.customerName}</td>
                <td className="px-4 py-3"><Badge tone="slate">{r.type}</Badge></td>
                <td className="px-4 py-3 font-medium text-slate-900">{money(r.amount, cur)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No payments recorded.</td></tr>}
          </tbody>
        </table>

        {totalPages > 1 && (
  <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2">
    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30">Prev</button>
    <span className="px-2 text-xs text-slate-500">Page {page} of {totalPages}</span>
    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30">Next</button>
  </div>
)}
      </Card>
    </>
  );
}
