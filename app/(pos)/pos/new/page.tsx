"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money } from "@/lib/format";
import {
  SERVICE_TYPES, HANG_FOLD, DELIVERY_TYPES, PAYMENT_TYPES, PLACEMENTS,
  ServiceType, HangFold, DeliveryType, PaymentType, Placement, 
  POSOrderItem, POSCustomer, POSService, lineTotal, computeTotals, isUrgentType, VAT_RATE,
} from "@/lib/pos";
import { Card, Button, Field, inputCls, Modal, Badge } from "@/components/ui";
import { Search, UserPlus, Trash2, Plus, Minus, X, ArrowRight, ArrowLeft, ShoppingCart } from "lucide-react";

export default function NewOrderPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const router = useRouter();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;
  const services = pos.servicesFor(t.id).filter((s) => s.active);
  const customers = pos.customersFor(t.id);

  const [tab, setTab] = useState<ServiceType>("Wash & Iron");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<POSOrderItem[]>([]);
  const [step, setStep] = useState<"build" | "pay">("build");

  // customer
  const [customer, setCustomer] = useState<POSCustomer | null>(null);
  const [custQuery, setCustQuery] = useState("");
  const [addCustOpen, setAddCustOpen] = useState(false);

  // order header
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("Pickup");
  const [deliveryDate, setDeliveryDate] = useState("2026-07-05");
  const [pickupTime, setPickupTime] = useState("18:00");
  const [placement, setPlacement] = useState<Placement>("Cabin");

  // payment
  const [discount, setDiscount] = useState(0);
  const [payType, setPayType] = useState<PaymentType>("Cash");
  const [payAmount, setPayAmount] = useState(0);
  const [notes, setNotes] = useState("");

const taxRate = t.taxEnabled ? t.taxRate : 0;
const totals = useMemo(() => computeTotals(items, discount, payAmount, VAT_RATE, taxRate), [items, discount, payAmount, taxRate]);
  const grid = services.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()));

  // qty already in cart for a garment at the active tab
  const cartQty = (svcId: string) => items.filter((i) => i.serviceId === svcId && i.serviceType === tab).reduce((s, i) => s + i.qty, 0);

  function tapItem(svc: POSService) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.serviceId === svc.id && i.serviceType === tab && i.hangFold === "Fold");
      if (idx >= 0) {
        const next = [...prev];
        const it = next[idx];
        next[idx] = { ...it, qty: it.qty + 1, lineTotal: lineTotal(it.unitPrice, it.qty + 1) };
        return next;
      }
      const unit = svc.prices[tab];
      return [...prev, {
        id: `tmp_${svc.id}_${tab}_${prev.length}`,
        serviceId: svc.id, serviceName: svc.name, serviceType: tab, qty: 1,
        unitPrice: unit, hangFold: "Fold", urgent: isUrgentType(tab), nasha: "None", lineTotal: lineTotal(unit, 1),
      }];
    });
  }

  function setQty(id: string, delta: number) {
    setItems((prev) => prev.flatMap((i) => {
      if (i.id !== id) return [i];
      const q = i.qty + delta;
      if (q <= 0) return [];
      return [{ ...i, qty: q, lineTotal: lineTotal(i.unitPrice, q) }];
    }));
  }
  function setHangFold(id: string, hf: HangFold) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, hangFold: hf } : i)));
  }

  const custMatches = customers.filter((c) => !custQuery || c.fullName.toLowerCase().includes(custQuery.toLowerCase()) || c.phone.includes(custQuery)).slice(0, 6);
  const canNext = customer && items.length > 0;

  function submit() {
    if (!customer || items.length === 0) return;
    const order = pos.createOrder({
      clientId: t.id, customerId: customer.id, customerName: customer.fullName, customerPhone: customer.phone,
      deliveryType, deliveryDate, pickupTime, placement, items, discount, salesman: "Admin", notes,
payment: payAmount > 0 ? { type: payType, amount: payAmount } : undefined, taxRate,
    });
    router.push(`/pos/orders/${order.id}`);
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">New order</h1>
          <Badge tone="slate">Draft</Badge>
        </div>
        <Badge tone="slate">VAT {VAT_RATE}% · {cur}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
        {/* LEFT — touch item grid */}
        <div>
          <Card className="mb-3 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item…" className={`${inputCls} pl-9`} />
            </div>
            <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
              {SERVICE_TYPES.map((st) => (
                <button key={st} onClick={() => setTab(st)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === st ? "bg-brand-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {st}{isUrgentType(st) && " ⚡"}
                </button>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {grid.map((s) => {
              const qty = cartQty(s.id);
              return (
                <button key={s.id} onClick={() => tapItem(s)} className={`relative flex flex-col items-start justify-between rounded-xl border bg-white p-3 text-left shadow-sm transition active:scale-95 ${qty > 0 ? "border-brand-400 ring-1 ring-brand-300" : "border-slate-200 hover:border-brand-300"}`}>
                  {qty > 0 && <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">{qty}</span>}
                  <div>
                    <div className="text-sm font-semibold leading-tight text-slate-800">{s.name}</div>
                    {s.nameArabic && <div className="text-xs text-slate-400" dir="rtl">{s.nameArabic}</div>}
                  </div>
                  <div className="mt-3 text-sm font-bold text-brand-700">{money(s.prices[tab], cur)}</div>
                </button>
              );
            })}
            {grid.length === 0 && <p className="col-span-full py-10 text-center text-sm text-slate-400">No items match “{q}”.</p>}
          </div>
        </div>

        {/* RIGHT — order / customer / payment */}
        <div>
          <Card className="sticky top-16 flex max-h-[calc(100vh-5rem)] flex-col">
            {/* order header */}
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <Meta label="Order date" value="2026-07-03" />
                <div>
                  <div className="mb-0.5 text-slate-400">Delivery</div>
                  <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs" />
                </div>
                <div>
                  <div className="mb-0.5 text-slate-400">Placement</div>
                  <select value={placement} onChange={(e) => setPlacement(e.target.value as Placement)} className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs">{PLACEMENTS.map((p) => <option key={p}>{p}</option>)}</select>
                </div>
                <div>
                  <div className="mb-0.5 text-slate-400">Pickup time</div>
                  <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs" />
                </div>
              </div>
            </div>

            {/* cart */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <span className="flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5" /> Items</span>
                <span>{items.reduce((s, i) => s + i.qty, 0)} pcs</span>
              </div>
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">Tap items on the left to add.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((it) => (
                    <li key={it.id} className="px-4 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800">{it.serviceName}</div>
                          <div className="text-[11px] text-slate-400">{it.serviceType} · {money(it.unitPrice, cur)}{it.urgent ? " · urgent" : ""}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-900">{money(it.lineTotal, cur)}</div>
                          <button onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="flex overflow-hidden rounded-md border border-slate-200">
                          {HANG_FOLD.map((hf) => (
                            <button key={hf} onClick={() => setHangFold(it.id, hf)} className={`px-2 py-0.5 text-[11px] font-medium ${it.hangFold === hf ? "bg-brand-600 text-white" : "bg-white text-slate-500"}`}>{hf}</button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setQty(it.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"><Minus className="h-3 w-3" /></button>
                          <span className="w-5 text-center text-sm font-semibold">{it.qty}</span>
                          <button onClick={() => setQty(it.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"><Plus className="h-3 w-3" /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* footer — customer + totals + step */}
            <div className="border-t border-slate-100 px-4 py-3">
              {step === "build" ? (
                <>
                  {/* customer */}
                  <div className="mb-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</span>
                      <button onClick={() => setAddCustOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"><UserPlus className="h-3.5 w-3.5" /> New</button>
                    </div>
                    {customer ? (
                      <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">{customer.fullName} {customer.isBlacklist && <Badge tone="rose">blacklist</Badge>}</div>
                          <div className="text-[11px] text-slate-500">{customer.phone}{customer.balance > 0 ? ` · outstanding ${money(customer.balance, cur)}` : ""}</div>
                        </div>
                        <button onClick={() => setCustomer(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          <input value={custQuery} onChange={(e) => setCustQuery(e.target.value)} placeholder="Phone or name…" className={`${inputCls} py-1.5 pl-8 text-sm`} />
                        </div>
                        {custQuery && (
                          <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                            {custMatches.map((c) => (
                              <li key={c.id}><button onClick={() => { setCustomer(c); setCustQuery(""); }} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-slate-50"><span className="font-medium text-slate-800">{c.fullName}</span><span className="text-xs text-slate-400">{c.phone}</span></button></li>
                            ))}
                            {custMatches.length === 0 && <li className="px-3 py-2 text-xs text-slate-400">No match — tap “New”.</li>}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                <TotalsRow label="Total" value={money(totals.sub + totals.vat + totals.Tax, cur)} big />
                  <Button className="mt-3 w-full" disabled={!canNext} onClick={() => { setPayAmount(0); setStep("pay"); }}>
                    Next: Payment <ArrowRight className="h-4 w-4" />
                  </Button>
                  {!canNext && <p className="mt-1.5 text-center text-[11px] text-slate-400">{items.length === 0 ? "Add at least one item" : "Select a customer"}</p>}
                </>
              ) : (
                <>
                  <div className="mb-2 space-y-1.5 text-sm">
                    <TotalsRow label="Subtotal" value={money(totals.sub, cur)} />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Discount</span>
                      <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-sm" />
                    
                    </div>
                    <TotalsRow label={`VAT ${VAT_RATE}%`} value={money(totals.vat, cur)} />
                     {taxRate > 0 && <TotalsRow label={`Tax ${taxRate}%`} value={money(totals.Tax, cur)} />}
                   <TotalsRow label="Total" value={money(totals.sub + totals.vat + totals.Tax - discount, cur)} big />
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Take payment</div>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={payType} onChange={(e) => setPayType(e.target.value as PaymentType)} className={`${inputCls} py-1.5 text-sm`}>{PAYMENT_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
                      <input type="number" min={0} value={payAmount} onChange={(e) => setPayAmount(Math.max(0, parseFloat(e.target.value) || 0))} className={`${inputCls} py-1.5 text-sm`} placeholder="0" />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <button onClick={() => setPayAmount(totals.total)} className="text-[11px] font-medium text-brand-600 hover:underline">Pay full</button>
                      <span className="text-sm">Balance <b className={totals.balance > 0 ? "text-amber-600" : "text-emerald-600"}>{money(totals.balance, cur)}</b></span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" onClick={() => setStep("build")}><ArrowLeft className="h-4 w-4" /> Back</Button>
                    <Button className="flex-1" onClick={submit}>Create order · {money(totals.total, cur)}</Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <AddCustomerModal open={addCustOpen} onClose={() => setAddCustOpen(false)} clientId={t.id} onCreated={(c) => { setCustomer(c); setAddCustOpen(false); }} />
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><div className="mb-0.5 text-slate-400">{label}</div><div className="rounded border border-slate-100 bg-slate-50 px-1.5 py-1 font-medium text-slate-600">{value}</div></div>;
}
function TotalsRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return <div className={`flex items-center justify-between ${big ? "border-t border-slate-100 pt-1.5 text-base font-semibold text-slate-900" : "text-sm"}`}><span className={big ? "" : "text-slate-500"}>{label}</span><span>{value}</span></div>;
}

function AddCustomerModal({ open, onClose, clientId, onCreated }: { open: boolean; onClose: () => void; clientId: string; onCreated: (c: POSCustomer) => void }) {
  const pos = usePos();
  const [f, setF] = useState({ fullName: "", phone: "", address: "" });
  return (
    <Modal open={open} onClose={onClose} title="New customer">
      <div className="space-y-4">
        <Field label="Full name"><input className={inputCls} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
        <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Address"><input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!f.fullName || !f.phone} onClick={() => { const c = pos.addCustomer({ clientId, isBlacklist: false, ...f }); onCreated(c); setF({ fullName: "", phone: "", address: "" }); }}>Add customer</Button>
      </div>
    </Modal>
  );
}
