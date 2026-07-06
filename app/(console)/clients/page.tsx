"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore, NewTenantInput } from "@/lib/store";
import { PLAN_MAP, PLANS } from "@/lib/catalog";
import { money, num, mb, dateLabel } from "@/lib/format";
import { TenantStatus, PlanId } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatusBadge, Badge, Button, Modal, Field, inputCls, Progress } from "@/components/ui";
import { Plus, Search } from "lucide-react";

const STATUS_FILTERS: (TenantStatus | "all")[] = ["all", "active", "trial", "suspended", "churned"];

export default function ClientsPage() {
  const { tenants, ready } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TenantStatus | "all">("all");
  const [plan, setPlan] = useState<PlanId | "all">("all");
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    return tenants.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (plan !== "all" && t.plan !== plan) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!(t.name.toLowerCase().includes(s) || t.slug.includes(s) || t.contactName.toLowerCase().includes(s) || t.country.toLowerCase().includes(s) || t.id.includes(s))) return false;
      }
      return true;
    });
  }, [tenants, q, status, plan]);

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${tenants.length} tenants provisioned on the platform.`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Provision client
          </Button>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, contact, country, clientId…" className={`${inputCls} pl-9`} />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition ${status === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={plan} onChange={(e) => setPlan(e.target.value as any)} className={`${inputCls} w-auto`}>
          <option value="all">All plans</option>
          {PLANS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Client</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Seats</th>
              <th className="px-4 py-3">Orders/30d</th>
              <th className="px-4 py-3">Storage</th>
              <th className="px-4 py-3">MRR</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((t) => {
              const p = PLAN_MAP[t.plan];
              const seatMax = p.seatLimit ?? t.seatsUsed + 5;
              return (
                <tr key={t.id} className="group hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <Link href={`/clients/${t.id}`} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-700">
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 group-hover:text-brand-600">{t.name}</div>
                        <div className="text-xs text-slate-400">{t.slug}.laundrypos.app · {t.country}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={t.plan === "enterprise" ? "violet" : t.plan === "professional" ? "brand" : "slate"}>{p.name}</Badge>
                    {t.locale === "ar" && <span className="ml-1 text-xs text-slate-400">AR</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    <div className="w-24">
                      <div className="mb-1 text-xs text-slate-500">{t.seatsUsed}{p.seatLimit ? ` / ${p.seatLimit}` : ""}</div>
                      <Progress value={t.seatsUsed} max={seatMax} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{num(t.monthlyOrders)}</td>
                  <td className="px-4 py-3 text-slate-600">{mb(t.storageUsedMB)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{money(t.mrr, t.currency)}</td>
                  <td className="px-4 py-3 text-slate-500">{dateLabel(t.createdAt)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">No clients match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <ProvisionModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ProvisionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addTenant } = useStore();
  const [f, setF] = useState<NewTenantInput>({
    name: "",
    slug: "",
    contactName: "",
    email: "",
    phone: "",
    country: "",
    currency: "USD",
    locale: "en",
    plan: "starter",
    trial: true,
  });

  const set = (k: keyof NewTenantInput, v: any) => setF((p) => ({ ...p, [k]: v }));
  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20);
  const valid = f.name && f.slug && f.contactName && f.email;

  function submit() {
    if (!valid) return;
    addTenant(f);
    onClose();
    setF({ name: "", slug: "", contactName: "", email: "", phone: "", country: "", currency: "USD", locale: "en", plan: "starter", trial: true });
  }

  return (
    <Modal open={open} onClose={onClose} title="Provision a new client" wide>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Business name">
          <input className={inputCls} value={f.name} onChange={(e) => { set("name", e.target.value); if (!f.slug) set("slug", autoSlug(e.target.value)); }} placeholder="Bright Laundry Co." />
        </Field>
        <Field label="Subdomain" hint={`${f.slug || "slug"}.laundrypos.app`}>
          <input className={inputCls} value={f.slug} onChange={(e) => set("slug", autoSlug(e.target.value))} placeholder="brightlaundry" />
        </Field>
        <Field label="Owner name">
          <input className={inputCls} value={f.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Jane Doe" />
        </Field>
        <Field label="Owner email">
          <input className={inputCls} value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@brightlaundry.com" />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 010 0000" />
        </Field>
        <Field label="Country">
          <input className={inputCls} value={f.country} onChange={(e) => set("country", e.target.value)} placeholder="United States" />
        </Field>
        <Field label="Currency">
          <select className={inputCls} value={f.currency} onChange={(e) => set("currency", e.target.value)}>
            {["USD", "GBP", "EUR", "AED", "SAR", "QAR", "AUD", "MXN", "JPY"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Locale">
          <select className={inputCls} value={f.locale} onChange={(e) => set("locale", e.target.value)}>
            <option value="en">English (LTR)</option>
            <option value="ar">Arabic (RTL)</option>
          </select>
        </Field>
        <Field label="Plan">
          <select className={inputCls} value={f.plan} onChange={(e) => set("plan", e.target.value)}>
            {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.priceMonthly)}/mo</option>)}
          </select>
        </Field>
        <Field label="Billing">
          <select className={inputCls} value={f.trial ? "trial" : "paid"} onChange={(e) => set("trial", e.target.value === "trial")}>
            <option value="trial">Start 21-day trial</option>
            <option value="paid">Activate paid immediately</option>
          </select>
        </Field>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">A new <code className="text-brand-700">clientId</code> and owner account are created automatically.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!valid}>Provision client</Button>
        </div>
      </div>
    </Modal>
  );
}
