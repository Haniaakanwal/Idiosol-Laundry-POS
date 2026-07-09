"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { PLAN_MAP, PLANS, FEATURES, isFeatureOn } from "@/lib/catalog";
import { money, num, mb, dateLabel, daysUntil } from "@/lib/format";
import { FeatureKey, UserRole } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, StatusBadge, Badge, Button, Toggle, Progress, Modal, Field, inputCls } from "@/components/ui";
import { ArrowLeft, ExternalLink, LogIn, Plus, Trash2, RotateCcw } from "lucide-react";


const TABS = ["Overview", "Access", "Users", "Billing", "Danger"] as const;
type Tab = (typeof TABS)[number];

export default function ClientDetail() {
  const params = useParams();
  const id = params.id as string;
  const store = useStore();
  const pos = usePos();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Overview");

  if (!store.ready) return <div className="text-sm text-slate-400">Loading…</div>;
  const t = store.tenants.find((x) => x.id === id);

  if (!t) return (
    <div>
      <Link href="/clients" className="text-sm text-brand-600">← Back to clients</Link>
      <p className="mt-4 text-sm text-slate-500">Client not found.</p>
    </div>
  );

  const plan = PLAN_MAP[t.plan];

  return (
    <>
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-lg font-semibold text-brand-700">
            {t.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{t.name}</h1>
              <StatusBadge status={t.status} />
              {t.locale === "ar" && <Badge tone="slate">Arabic / RTL</Badge>}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
              <a href="#" className="inline-flex items-center gap-1 text-brand-600 hover:underline">{t.slug}.laundrypos.app <ExternalLink className="h-3 w-3" /></a>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-xs">{t.id}</span>
              <span className="text-slate-300">·</span>
              <span>{t.country}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => { pos.setActiveClient(t.id); router.push("/pos"); }}><LogIn className="h-4 w-4" /> Log in as client</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${tab === tb ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tb}
            {tb === "Users" && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{store.usersFor(t.id).length}</span>}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab t={t} />}
      {tab === "Access" && <AccessTab t={t} />}
      {tab === "Users" && <UsersTab t={t} />}
      {tab === "Billing" && <BillingTab t={t} />}
      {tab === "Danger" && <DangerTab t={t} />}
    </>
  );
}

// ---------------------------------------------------------------------------
function OverviewTab({ t }: { t: any }) {
  const plan = PLAN_MAP[t.plan];
  const onCount = FEATURES.filter((f) => isFeatureOn(t.plan, t.featureOverrides, f.key)).length;
  const trialDays = daysUntil(t.trialEndsAt);
 
const [taxRate, setTaxRate] = useState(t.taxRate);
 const { updateTenant } = useStore();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Usage</h3>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Metric label="Orders / 30d" value={num(t.monthlyOrders)} />
            <Metric label="Branches" value={`${t.branches}${plan.branchLimit ? ` / ${plan.branchLimit}` : ""}`} />
            <Metric label="Seats" value={`${t.seatsUsed}${plan.seatLimit ? ` / ${plan.seatLimit}` : ""}`} />
            <Metric label="Modules on" value={`${onCount} / ${FEATURES.length}`} />
          </div>
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Storage</span><span>{mb(t.storageUsedMB)} / {mb(plan.storageLimitMB)}</span></div>
            <Progress value={t.storageUsedMB} max={plan.storageLimitMB} />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Contact</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Row label="Owner" value={t.contactName} />
            <Row label="Email" value={t.email} />
            <Row label="Phone" value={t.phone} />
            <Row label="Country" value={t.country} />
            <Row label="Currency" value={t.currency} />
            <Row label="Locale" value={t.locale === "ar" ? "Arabic (RTL)" : "English"} />
          </dl>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Subscription</h3>
          <Card className="p-5">
  <div className="mb-3 flex items-center justify-between">
    <h3 className="text-sm font-semibold text-slate-900">Tax</h3>
    <Toggle on={t.taxEnabled} onChange={(v) => updateTenant(t.id, { taxEnabled: v })} />
  </div>
  <div className="flex items-center gap-2">
    <input
      type="number"
      value={taxRate}
      onChange={(e) => setTaxRate(Number(e.target.value))}
      onBlur={() => updateTenant(t.id, { taxRate })}
      disabled={!t.taxEnabled}
      className={`${inputCls} w-20 text-right disabled:opacity-50`}
    />
    <span className="text-sm text-slate-500">%</span>
  </div>
</Card>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-lg font-semibold text-slate-900">{plan.name}</div>
            <div className="text-sm text-slate-500">{money(plan.priceMonthly, t.currency)}/mo · {plan.blurb}</div>
          </div>
        {t.status === "trial" && (
  <button onClick={() => updateTenant(t.id, { status: "active", mrr: PLAN_MAP[t.plan].priceMonthly })} className="mt-2 w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white">
    End trial now
  </button>
)}
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Lifecycle</h3>
          <dl className="space-y-3 text-sm">
            <Row label="Client ID" value={<span className="font-mono text-xs">{t.id}</span>} />
            <Row label="Created" value={dateLabel(t.createdAt)} />
            <Row label="MRR" value={money(t.mrr, t.currency)} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function AccessTab({ t }: { t: any }) {
  const { toggleFeature, clearOverride, setPlan } = useStore();
  const cats = ["Core", "Finance", "Growth", "Platform"] as const;

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Plan controls the baseline</h3>
          <p className="mt-1 text-sm text-slate-500">Switch plans to change defaults, or override individual modules below. Overrides win over the plan.</p>
        </div>
        <div className="flex items-center gap-2">
          {PLANS.map((p) => (
            <button key={p.id} onClick={() => setPlan(t.id, p.id)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${t.plan === p.id ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {p.name}
            </button>
          ))}
        </div>
      </Card>

      {cats.map((cat) => {
        const items = FEATURES.filter((f) => f.category === cat);
        return (
          <Card key={cat} className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{cat}</div>
            <ul className="divide-y divide-slate-100">
              {items.map((f) => {
                const inPlan = (PLAN_MAP[t.plan].features as FeatureKey[]).includes(f.key);
                const override = t.featureOverrides[f.key];
                const on = isFeatureOn(t.plan, t.featureOverrides, f.key);
                const overridden = override !== undefined;
                return (
                  <li key={f.key} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{f.name}</span>
                        {!inPlan && <Badge tone="amber">add-on</Badge>}
                        {overridden && (
                          <button onClick={() => clearOverride(t.id, f.key)} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline">
                            <RotateCcw className="h-3 w-3" /> reset to plan
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">{f.description}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <div className="text-[11px] text-slate-400">plan default</div>
                      <div className={`text-xs font-medium ${inPlan ? "text-emerald-600" : "text-slate-400"}`}>{inPlan ? "included" : "excluded"}</div>
                    </div>
                    <Toggle on={on} onChange={(v) => toggleFeature(t.id, f.key, v)} />
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
const ROLES: UserRole[] = ["Owner", "Admin", "Manager", "Cashier", "Driver"];

function UsersTab({ t }: { t: any }) {
  const { usersFor, addUser, removeUser, updateUser } = useStore();
  const users = usersFor(t.id);
  const [open, setOpen] = useState(false);
const [nu, setNu] = useState({ name: "", username: "", password: "", role: "Cashier" as UserRole, department: "Front Counter" });
  const plan = PLAN_MAP[t.plan];
  const atLimit = plan.seatLimit !== null && users.length >= plan.seatLimit;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Staff accounts</h3>
          <p className="text-xs text-slate-400">{users.length}{plan.seatLimit ? ` of ${plan.seatLimit}` : ""} seats used{atLimit ? " · seat limit reached" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} disabled={atLimit}><Plus className="h-4 w-4" /> Invite user</Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-5 py-2.5">Name</th>
            <th className="px-4 py-2.5">Role</th>
            <th className="px-4 py-2.5">Department</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Last active</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3">
                <div className="font-medium text-slate-900">{u.name}</div>
                <div className="text-xs text-slate-400">{u.email}</div>
              </td>
              <td className="px-4 py-3">
                <select value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700" disabled={u.role === "Owner"}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 text-slate-600">{u.department}</td>
              <td className="px-4 py-3">
                <Badge tone={u.status === "active" ? "green" : u.status === "invited" ? "amber" : "slate"}>{u.status}</Badge>
              </td>
              <td className="px-4 py-3 text-slate-500">{u.lastActive}</td>
              <td className="px-4 py-3 text-right">
                {u.role !== "Owner" && (
                  <button onClick={() => removeUser(u.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={open} onClose={() => setOpen(false)} title={`Invite user to ${t.name}`}>
        <div className="space-y-4">
          <Field label="Full name"><input className={inputCls} value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} placeholder="Alex Rivera" /></Field>
<Field label="Username"><input className={inputCls} value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} placeholder="alex.rivera" /></Field>
<Field label="Password"><input className={inputCls} value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} placeholder="temp password" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role"><select className={inputCls} value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as UserRole })}>{ROLES.filter((r) => r !== "Owner").map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label="Department"><input className={inputCls} value={nu.department} onChange={(e) => setNu({ ...nu, department: e.target.value })} /></Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
<Button disabled={!nu.name || !nu.username || !nu.password} onClick={() => { addUser(t.id, nu); setOpen(false); setNu({ name: "", username: "", password: "", role: "Cashier", department: "Front Counter" }); }}>Send invite</Button>
        </div>
      </Modal>
    </Card>
  );
}

// ---------------------------------------------------------------------------
function BillingTab({ t }: { t: any }) {
  const plan = PLAN_MAP[t.plan];
  const invoices = [
    { id: "INV-2041", date: "2026-07-01", amount: t.mrr, status: t.status === "suspended" ? "failed" : "paid" },
    { id: "INV-1996", date: "2026-06-01", amount: plan.priceMonthly, status: "paid" },
    { id: "INV-1951", date: "2026-05-01", amount: plan.priceMonthly, status: "paid" },
  ];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-1">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Current plan</h3>
        <div className="text-2xl font-semibold text-slate-900">{money(plan.priceMonthly, t.currency)}<span className="text-sm font-normal text-slate-400">/mo</span></div>
        <div className="mt-1 text-sm text-slate-500">{plan.name} · billed monthly</div>
        <div className="mt-4 space-y-2 text-sm">
          <Row label="Status" value={<StatusBadge status={t.status} />} />
          <Row label="Next invoice" value="2026-08-01" />
          <Row label="Method" value="Visa •••• 4242" />
        </div>
      </Card>
      <Card className="overflow-hidden lg:col-span-2">
        <div className="border-b border-slate-100 px-5 py-3.5"><h3 className="text-sm font-semibold text-slate-900">Invoices</h3></div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5">Invoice</th><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Amount</th><th className="px-4 py-2.5">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((iv) => (
              <tr key={iv.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3 font-mono text-xs text-slate-700">{iv.id}</td>
                <td className="px-4 py-3 text-slate-600">{iv.date}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{money(iv.amount, t.currency)}</td>
                <td className="px-4 py-3"><Badge tone={iv.status === "paid" ? "green" : "rose"}>{iv.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
function DangerTab({ t }: { t: any }) {
  const { setStatus } = useStore();
  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Suspend access</h3>
          <p className="mt-1 text-sm text-slate-500">Blocks all logins for this client. Data is retained and billing continues.</p>
        </div>
        {t.status === "suspended" ? (
          <Button variant="secondary" onClick={() => setStatus(t.id, "active")}>Reactivate</Button>
        ) : (
          <Button variant="secondary" onClick={() => setStatus(t.id, "suspended")} disabled={t.status === "churned"}>Suspend</Button>
        )}
      </Card>
      <Card className="flex items-center justify-between border-rose-200 p-5">
        <div>
          <h3 className="text-sm font-semibold text-rose-700">Cancel subscription</h3>
          <p className="mt-1 text-sm text-slate-500">Marks the client as churned and stops billing. Retained for 90 days before purge.</p>
        </div>
        <Button variant="danger" onClick={() => setStatus(t.id, "churned")} disabled={t.status === "churned"}>Cancel & churn</Button>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
