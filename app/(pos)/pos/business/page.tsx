"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money } from "@/lib/format";
import { Card, Badge } from "@/components/ui";

// Corporate/account view: customers carrying a running balance are treated as
// on-account (invoice-later) customers — the "Business" module of the DDR.
export default function BusinessPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;
  const customers = pos.customersFor(t.id);
  const orders = pos.ordersFor(t.id);

  const accounts = customers.filter((c) => c.balance > 0);
  const receivable = accounts.reduce((s, c) => s + c.balance, 0);



  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Business Accounts</h1>
      <p className="mb-5 text-sm text-slate-500">On-account customers with an open balance · {money(receivable, cur)} receivable</p>


      {accounts.length === 0 ? (
        <Card className="py-14 text-center text-sm text-slate-400">No open account balances.</Card>
      ) : (
        <div className="space-y-4">
          {accounts.map((c) => {
            const co = orders.filter((o) => o.customerId === c.id && o.balance > 0);
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                  <div><div className="font-medium text-slate-900">{c.fullName}</div><div className="text-xs text-slate-400">{c.phone}</div></div>
                  <Badge tone="amber">{money(c.balance, cur)} due</Badge>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {co.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-2.5"><Link href={`/pos/orders/${o.id}`} className="font-mono text-xs text-brand-600 hover:underline">{o.reference}</Link></td>
                        <td className="px-4 py-2.5 text-slate-500">{o.date}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">total {money(o.total, cur)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-amber-600">bal {money(o.balance, cur)}</td>
                      </tr>
                    ))}
                    {co.length === 0 && <tr><td className="px-5 py-2.5 text-xs text-slate-400" colSpan={4}>Balance carried from prior orders.</td></tr>}
                  </tbody>
                </table>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
