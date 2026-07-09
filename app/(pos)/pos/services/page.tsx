"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { money } from "@/lib/format";
import { SERVICE_TYPES, SERVICE_CATEGORIES, ServiceCategory, ServiceType, POSService, TYPE_MULT, newServicePrices } from "@/lib/pos";
import { Card, Button, Badge, Toggle, Modal, Field, inputCls } from "@/components/ui";
import { Plus, Search } from "lucide-react";

export default function ServicesPage() {
  const { tenants } = useStore();
  const pos = usePos();
  const t = tenants.find((x) => x.id === pos.activeClientId)!;
  const cur = t.currency;
  const services = pos.servicesFor(t.id);
  const [open, setOpen] = useState(false);
const [q, setQ] = useState("");
const [editing, setEditing] = useState<POSService | null>(null);

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div><h1 className="text-xl font-semibold text-slate-900">Services &amp; Pricing</h1><p className="text-sm text-slate-500">Price matrix — garment × service type</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New service</Button>
      </div>

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search service…" className={`${inputCls} pl-9`} />
        </div>
      </Card>

      {SERVICE_CATEGORIES.map((cat) => {
      const items = services.filter((s) => s.category === cat && (!q || s.name.toLowerCase().includes(q.toLowerCase())));
        if (!items.length) return null;
        return (
          <Card key={cat} className="mb-4 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{cat}</div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2">Garment</th>
                {SERVICE_TYPES.map((st) => <th key={st} className="px-3 py-2 text-right">{st}</th>)}
                <th className="px-4 py-2 text-center">Active</th>
                <th className="px-4 py-2"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((s) => (
                  <tr key={s.id} className={`hover:bg-slate-50/60 ${s.active ? "" : "opacity-50"}`}>
                    <td className="px-5 py-2.5"><div className="font-medium text-slate-800">{s.name}</div>{s.nameArabic && <div className="text-xs text-slate-400" dir="rtl">{s.nameArabic}</div>}</td>
                    {SERVICE_TYPES.map((st) => (
                      <td key={st} className="px-3 py-2.5 text-right">
                        <PriceCell value={s.prices[st]} onSave={(v) => pos.updateService(s.id, { prices: { ...s.prices, [st]: v } })} cur={cur} />
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center"><div className="flex justify-center"><Toggle on={s.active} onChange={(v) => pos.updateService(s.id, { active: v })} /></div></td>
                    <td className="px-4 py-2.5 text-right"><button onClick={() => setEditing(s)} className="text-xs font-medium text-brand-600 hover:underline">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        );
      })}

      <NewServiceModal open={open} onClose={() => setOpen(false)} clientId={t.id} cur={cur} />
        {editing && <EditServiceModal service={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function PriceCell({ value, onSave, cur }: { value: number; onSave: (v: number) => void; cur: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  if (editing) return (
    <input autoFocus type="number" value={v} onChange={(e) => setV(parseFloat(e.target.value) || 0)} onBlur={() => { onSave(v); setEditing(false); }} onKeyDown={(e) => { if (e.key === "Enter") { onSave(v); setEditing(false); } }} className="w-20 rounded-md border border-brand-300 px-2 py-1 text-right text-sm" />
  );
  return <button onClick={() => { setV(value); setEditing(true); }} className="rounded px-2 py-1 font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">{money(value, cur)}</button>;
}

function NewServiceModal({ open, onClose, clientId, cur }: { open: boolean; onClose: () => void; clientId: string; cur: string }) {
  const pos = usePos();
  const [name, setName] = useState("");
  const [nameArabic, setNameArabic] = useState("");
  const [category, setCategory] = useState<ServiceCategory>("Gents");
  const [base, setBase] = useState(5);
  return (
    <Modal open={open} onClose={onClose} title="New service">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Arabic name"><input className={inputCls} dir="rtl" value={nameArabic} onChange={(e) => setNameArabic(e.target.value)} /></Field>
          <Field label="Category"><select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory)}>{SERVICE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Base (Wash & Iron) price" hint="Other types auto-scale from this"><input type="number" className={inputCls} value={base} onChange={(e) => setBase(parseFloat(e.target.value) || 0)} /></Field>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          {SERVICE_TYPES.map((st) => <span key={st} className="mr-3 inline-block">{st}: <b className="text-slate-700">{money(Math.round(base * TYPE_MULT[st]), cur)}</b></span>)}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!name} onClick={() => {
          pos.addService({ clientId, name, nameArabic, category, prices: newServicePrices(base), active: true });
          onClose(); setName(""); setNameArabic(""); setBase(5);
        }}>Add service</Button>
      </div>
    </Modal>
  );
}
function EditServiceModal({ service, onClose }: { service: POSService; onClose: () => void }) {
  const pos = usePos();
  const [name, setName] = useState(service.name);
  const [nameArabic, setNameArabic] = useState(service.nameArabic ?? "");
  const [category, setCategory] = useState<ServiceCategory>(service.category);
  return (
    <Modal open onClose={onClose} title={`Edit ${service.name}`}>
      <div className="space-y-4">
        <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Arabic name"><input className={inputCls} dir="rtl" value={nameArabic} onChange={(e) => setNameArabic(e.target.value)} /></Field>
        <Field label="Category"><select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory)}>{SERVICE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { pos.updateService(service.id, { name, nameArabic, category }); onClose(); }}>Save</Button>
      </div>
    </Modal>
  );
}