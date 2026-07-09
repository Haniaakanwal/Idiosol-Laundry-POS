"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money } from "@/lib/format";
import { POSCustomer } from "@/lib/pos";
import { Card, Button, Badge, Modal, Field, inputCls, Toggle } from "@/components/ui";
import { Search, UserPlus, ShoppingBag } from "lucide-react";


export default function CustomersPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;
  const customers = pos.customersFor(t.id);
  const orders = pos.ordersFor(t.id);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<POSCustomer | null>(null);
const [expanded, setExpanded] = useState<string | null>(null);
  const rows = useMemo(() => customers.filter((c) => !q || c.fullName.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)), [customers, q]);
  const orderCount = (id: string) => orders.filter((o) => o.customerId === id).length;

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div><h1 className="text-xl font-semibold text-slate-900">Customers</h1><p className="text-sm text-slate-500">{customers.length} customers</p></div>
        <Button onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" /> New customer</Button>
      </div>

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone…" className={`${inputCls} pl-9`} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Flags</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                <td className="px-5 py-3"><div className="font-medium text-slate-900">{c.fullName}</div><div className="text-xs text-slate-400">{c.address}</div></td>
                <td className="px-4 py-3 text-slate-600">{c.phone}</td>
               <td className="px-4 py-3">
  <Link href={`/pos/orders?customerId=${c.id}`} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
    <ShoppingBag className="h-3.5 w-3.5" /> {orderCount(c.id)}
  </Link>
</td>
                <td className="px-4 py-3">{c.balance > 0 ? <span className="font-medium text-amber-600">{money(c.balance, cur)}</span> : <span className="text-slate-400">—</span>}</td>
                <td className="px-4 py-3">{c.isBlacklist && <Badge tone="rose">blacklist</Badge>}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => setEdit(c)} className="text-xs font-medium text-brand-600 hover:underline">Edit</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No customers match.</td></tr>}
          </tbody>
        </table>
      </Card>

      <CustomerModal open={open} onClose={() => setOpen(false)} clientId={t.id} />
      {edit && <EditCustomerModal customer={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function CustomerModal({ open, onClose, clientId }: { open: boolean; onClose: () => void; clientId: string }) {
  const pos = usePos();
  const [f, setF] = useState({ fullName: "", phone: "", address: "", note: "" });
  return (
    <Modal open={open} onClose={onClose} title="New customer">
      <div className="space-y-4">
        <Field label="Full name"><input className={inputCls} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Address"><input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!f.fullName || !f.phone} onClick={() => { pos.addCustomer({ clientId, isBlacklist: false, fullName: f.fullName, phone: f.phone, address: f.address }); onClose(); setF({ fullName: "", phone: "", address: "", note: "" }); }}>Add</Button>
      </div>
    </Modal>
  );
}

function EditCustomerModal({ customer, onClose }: { customer: POSCustomer; onClose: () => void }) {
  const pos = usePos();
  const [f, setF] = useState({ fullName: customer.fullName, phone: customer.phone, address: customer.address, isBlacklist: customer.isBlacklist });
  return (
    <Modal open onClose={onClose} title={`Edit ${customer.fullName}`}>
      <div className="space-y-4">
        <Field label="Full name"><input className={inputCls} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Address"><input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="text-sm font-medium text-slate-600">Blacklisted</span><Toggle on={f.isBlacklist} onChange={(v) => setF({ ...f, isBlacklist: v })} /></div>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { pos.updateCustomer(customer.id, f); onClose(); }}>Save</Button>
      </div>
    </Modal>
  );
}
