"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money } from "@/lib/format";
import { PAYMENT_TYPES } from "@/lib/pos";
import { Card, Badge, inputCls } from "@/components/ui";

const PAGE_SIZE = 50;

export default function PaymentsPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<{ rows: any[]; total: number; totalAmount: number }>({ rows: [], total: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  useEffect(() => setPage(1), [type]);

  useEffect(() => {
    const myReqId = ++reqId.current;
    setLoading(true);
    const params = new URLSearchParams({ tenantId: t.id, page: String(page), limit: String(PAGE_SIZE) });
    if (type !== "all") params.set("type", type);
    fetch(`/api/payments?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (myReqId === reqId.current) setData(d); })
      .finally(() => { if (myReqId === reqId.current) setLoading(false); });
  }, [t.id, page, type]);

  const rows = data.rows;
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div><h1 className="text-xl font-semibold text-slate-900">Payments</h1><p className="text-sm text-slate-500">{data.total} receipts · {money(data.totalAmount, cur)} collected</p></div>
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
            {loading && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">Loading…</td></tr>
            )}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3 font-mono text-xs text-slate-600">{r.ref}</td>
                <td className="px-4 py-3 text-slate-500">{r.date}</td>
                <td className="px-4 py-3"><Link href={`/pos/orders/${r.order.id}`} className="font-mono text-xs text-brand-600 hover:underline">{r.order.reference}</Link></td>
                <td className="px-4 py-3 text-slate-700">{r.order.customerName}</td>
                <td className="px-4 py-3"><Badge tone="slate">{r.type}</Badge></td>
                <td className="px-4 py-3 font-medium text-slate-900">{money(r.amount, cur)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No payments recorded.</td></tr>}
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