"use client";

import { PageHeader } from "@/components/PageHeader";
import { Card, Badge } from "@/components/ui";
import { ArrowRight } from "lucide-react";

const TABLES = [
  { name: "clients", note: "The tenant registry — one row per laundry business", cols: ["id (clientId)", "name", "slug", "plan", "status", "locale", "currency"], tenantScoped: false },
  { name: "users", note: "Staff accounts (was: User Accounts)", cols: ["id", "clientId", "name", "email", "role", "department", "status"], tenantScoped: true },
  { name: "customers", note: "Individual customers (was: Customers)", cols: ["id", "clientId", "fullName", "phone", "balance", "isBlacklist"], tenantScoped: true },
  { name: "businesses", note: "Corporate accounts (was: Business)", cols: ["id", "clientId", "company", "contact", "amountBalance"], tenantScoped: true },
  { name: "services", note: "Service catalog + prices (was: Services / Services_Price)", cols: ["id", "clientId", "name", "category", "price", "nameArabic"], tenantScoped: true },
  { name: "transactions", note: "POS orders / invoices (was: Transaction)", cols: ["id", "clientId", "reference", "customerId", "amountTotal", "status", "deliveryDate"], tenantScoped: true },
  { name: "order_items", note: "Line items (was: Items)", cols: ["id", "clientId", "transactionId", "serviceId", "qty", "price", "urgent"], tenantScoped: true },
  { name: "payments", note: "Payment capture (was: Payments)", cols: ["id", "clientId", "transactionId", "type", "amount", "refNumber"], tenantScoped: true },
  { name: "vat_returns", note: "Tax periods (was: VAT Returns)", cols: ["id", "clientId", "dateFrom", "dateTo", "amount", "status"], tenantScoped: true },
];

export default function DataModelPage() {
  return (
    <>
      <PageHeader title="Data Model" subtitle="How the per-client FileMaker copies collapse into one shared, tenant-scoped schema." />

      <Card className="mb-6 p-6">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Before — FileMaker</div>
            <p className="mt-2 text-sm text-slate-600">One <code className="rounded bg-white px-1 text-brand-700">LaundryPOS.fmp12</code> copied per client. 10 clients = 10 databases to host, patch and back up separately.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["marina.fmp12", "crown.fmp12", "soapbox.fmp12", "…"].map((x) => <span key={x} className="rounded bg-white px-2 py-0.5 font-mono text-[11px] text-slate-500 ring-1 ring-slate-200">{x}</span>)}
            </div>
          </div>
          <ArrowRight className="mx-auto hidden h-6 w-6 text-slate-300 md:block" />
          <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-500">After — Vercel + Postgres</div>
            <p className="mt-2 text-sm text-slate-600">One database. Every row carries a <code className="rounded bg-white px-1 text-brand-700">clientId</code>. Clients only ever see their own slice; you manage them all from this console.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="brand">Row-Level Security</Badge>
              <Badge tone="brand">clientId on every table</Badge>
              <Badge tone="brand">shared migrations</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="rounded bg-brand-100 px-1.5 py-0.5 font-mono text-[10px] text-brand-700">clientId</span> = tenant discriminator, indexed & filtered on every query</span>
      </div>

      <div className="space-y-3">
        {TABLES.map((t) => (
          <Card key={t.name} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <code className="text-sm font-semibold text-slate-900">{t.name}</code>
                {t.tenantScoped ? <Badge tone="brand">tenant-scoped</Badge> : <Badge tone="violet">control plane</Badge>}
              </div>
              <span className="text-xs text-slate-400">{t.note}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {t.cols.map((c) => (
                <span key={c} className={`rounded px-2 py-0.5 font-mono text-[11px] ring-1 ${c.startsWith("clientId") || c.startsWith("id (clientId") ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-slate-50 text-slate-500 ring-slate-200"}`}>{c}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 bg-slate-900 p-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Every tenant query, enforced by policy</div>
        <pre className="overflow-x-auto text-sm text-slate-200"><code>{`-- Row-Level Security keeps tenants isolated automatically
CREATE POLICY tenant_isolation ON transactions
  USING (client_id = current_setting('app.client_id')::uuid);

-- App code never forgets the filter:
SELECT * FROM transactions WHERE client_id = $clientId;`}</code></pre>
      </Card>
    </>
  );
}
