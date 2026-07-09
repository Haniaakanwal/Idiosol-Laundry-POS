"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money } from "@/lib/format";
import { STATUS_FLOW, PAYMENT_TYPES, PaymentType  } from "@/lib/pos";
import { Card, Button, Badge, Modal, Field, inputCls } from "@/components/ui";
import { OrderStatusBadge } from "@/components/pos/bits";
import { ArrowLeft, Printer, Truck, CheckCircle2, Ban, MoreVertical, Wallet, MessageSquare, Send } from "lucide-react";

export default function OrderDetail() {
  const params = useParams();
  const id = params.id as string;
  const { tenants } = useStore();
  const pos = usePos();
  const [payOpen, setPayOpen] = useState(false);
  const [pt, setPt] = useState<PaymentType>("Cash");
  const [amt, setAmt] = useState(0);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  function flash(m: string) { setToast(m); setTimeout(() => setToast(""), 2600); }

  const o = pos.orderById(id);
  const t = tenants.find((x) => x.id === o?.clientId);
  if (!o || !t) return <div><Link href="/pos/orders" className="text-sm text-brand-600">← Orders</Link><p className="mt-4 text-sm text-slate-500">Order not found.</p></div>;
  const cur = t.currency;
  const flow = STATUS_FLOW[o.status];

  return (
    <>
      <Link href="/pos/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"><ArrowLeft className="h-4 w-4" /> Orders</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xl font-semibold text-slate-900">{o.reference}</h1>
            <OrderStatusBadge status={o.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{o.date} · {o.deliveryType} · ready by {o.deliveryDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Ticket</Button>
          {o.status !== "Delivered" && o.status !== "Cancelled" && (
            <Button variant="secondary" onClick={() => pos.setOrderStatus(o.id, "Cancelled")}><Ban className="h-4 w-4" /> Cancel</Button>
          )}
          {flow.next && (
            <Button onClick={() => pos.setOrderStatus(o.id, flow.next!)}>
              {o.status === "Ready" ? <Truck className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} {flow.label}
            </Button>
          )}
          {/* per-order quick actions */}
          <div className="relative print:hidden">
            <button onClick={() => setMenu((v) => !v)} onBlur={() => setTimeout(() => setMenu(false), 150)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
              <MoreVertical className="h-5 w-5" />
            </button>
            {menu && (
              <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <MenuItem icon={Wallet} label="Add payment" disabled={o.balance <= 0} onClick={() => { setMenu(false); setAmt(Math.round(o.balance)); setPayOpen(true); }} />
                <MenuItem icon={Truck} label="Deliver order" disabled={o.status === "Delivered" || o.status === "Cancelled"} onClick={() => { setMenu(false); pos.setOrderStatus(o.id, "Delivered"); flash("Order marked delivered"); }} />
                <MenuItem icon={Printer} label="Print order" onClick={() => { setMenu(false); window.print(); }} />
                <MenuItem icon={MessageSquare} label="Custom SMS" onClick={() => { setMenu(false); flash(`SMS queued to ${o.customerName}`); }} />
       <MenuItem icon={Send} label="Send order (WhatsApp)" onClick={async () => {
  setMenu(false);
  const ok = await pos.sendWhatsApp(t.id, o.customerId, o.customerPhone, `Your order ${o.reference} update: ${o.status}`, o.id);
  flash(ok ? `Order ${o.reference} sent to ${o.customerPhone}` : "Failed to send WhatsApp message");
}} />
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 print:hidden">
          <CheckCircle2 className="h-4 w-4" /> {toast}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3"><h2 className="text-sm font-semibold text-slate-900">Items</h2></div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400"><th className="px-5 py-2">Item</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Total</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {o.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-5 py-2.5"><div className="font-medium text-slate-800">{it.serviceName}</div><div className="text-xs text-slate-400">{it.hangFold}{it.nasha !== "None" ? ` · starch ${it.nasha}` : ""} · {it.placement}{it.urgent ? " · urgent" : ""}</div></td>
                    <td className="px-3 py-2.5 text-slate-600">{it.serviceType}</td>
                    <td className="px-3 py-2.5 text-slate-600">{it.qty}</td>
                    <td className="px-3 py-2.5 text-slate-600">{money(it.unitPrice, cur)}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{money(it.lineTotal, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Payments</h2>
              {o.balance > 0 && <Button size="sm" onClick={() => { setAmt(Math.round(o.balance)); setPayOpen(true); }}>Take payment</Button>}
            </div>
            {o.payments.length === 0 ? <p className="px-5 py-6 text-sm text-slate-400">No payments recorded.</p> : (
              <ul className="divide-y divide-slate-100">
                {o.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className="text-slate-600">{p.date} · <Badge tone="slate">{p.type}</Badge> <span className="text-xs text-slate-400">{p.ref}</span></span>
                    <span className="font-medium text-slate-900">{money(p.amount, cur)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Customer</h2>
            <div className="font-medium text-slate-900">{o.customerName}</div>
            <div className="text-sm text-slate-500">{o.customerPhone}</div>
            {o.notes && <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{o.notes}</div>}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Totals</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={money(o.sub, cur)} />
              <Row label="Discount" value={`- ${money(o.discount, cur)}`} />
            
            {((o as any).taxRate) > 0 && <Row label={`Tax (${(o as any).taxRate}%)`} value={money((o as any).tax, cur)} />}
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold text-slate-900"><span>Total</span><span>{money(o.total, cur)}</span></div>
              <Row label="Paid" value={money(o.paid, cur)} />
              <div className="flex justify-between text-sm font-semibold"><span className="text-slate-500">Balance</span><span className={o.balance > 0 ? "text-amber-600" : "text-emerald-600"}>{money(o.balance, cur)}</span></div>
            </dl>
          </Card>
        </div>
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Take payment · ${o.reference}`}>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-500">Balance due </span><span className="font-semibold text-slate-900">{money(o.balance, cur)}</span></div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Method"><select className={inputCls} value={pt} onChange={(e) => setPt(e.target.value as PaymentType)}>{PAYMENT_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Amount"><input type="number" className={inputCls} value={amt} onChange={(e) => setAmt(Math.max(0, parseFloat(e.target.value) || 0))} /></Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={() => setPayOpen(false)}>Cancel</Button>
          <Button disabled={amt <= 0} onClick={() => { pos.addOrderPayment(o.id, pt, Math.min(amt, o.balance)); setPayOpen(false); }}>Record {money(Math.min(amt, o.balance), cur)}</Button>
        </div>
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-slate-500">{label}</dt><dd className="text-slate-800">{value}</dd></div>;
}

function MenuItem({ icon: Icon, label, onClick, disabled }: { icon: any; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white">
      <Icon className="h-4 w-4 text-slate-400" /> {label}
    </button>
  );
}
