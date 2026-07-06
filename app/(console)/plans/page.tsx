"use client";

import { useStore } from "@/lib/store";
import { PLANS, FEATURES } from "@/lib/catalog";
import { money, num } from "@/lib/format";
import { FeatureKey } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui";
import { Check, Minus } from "lucide-react";

export default function PlansPage() {
  const { tenants, ready } = useStore();
  const count = (planId: string) => tenants.filter((t) => t.plan === planId && t.status !== "churned").length;
  const mrr = (planId: string) => tenants.filter((t) => t.plan === planId).reduce((s, t) => s + t.mrr, 0);

  return (
    <>
      <PageHeader title="Plans & Billing" subtitle="Subscription tiers and the module entitlements each unlocks." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.id} className={`p-6 ${p.id === "professional" ? "ring-2 ring-brand-500" : ""}`}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
              {p.id === "professional" && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">Popular</span>}
            </div>
            <p className="mt-1 text-sm text-slate-500">{p.blurb}</p>
            <div className="mt-4 text-3xl font-semibold text-slate-900">{money(p.priceMonthly)}<span className="text-base font-normal text-slate-400">/mo</span></div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-xs">
              <div><div className="font-semibold text-slate-900">{ready ? count(p.id) : "—"}</div><div className="text-slate-400">clients</div></div>
              <div><div className="font-semibold text-slate-900">{p.seatLimit ?? "∞"}</div><div className="text-slate-400">seats</div></div>
              <div><div className="font-semibold text-slate-900">{p.branchLimit ?? "∞"}</div><div className="text-slate-400">branches</div></div>
            </div>
            <div className="mt-3 text-center text-xs text-slate-400">{ready ? money(mrr(p.id)) : "—"} MRR from this tier</div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 overflow-x-auto">
        <div className="border-b border-slate-100 px-5 py-3.5"><h3 className="text-sm font-semibold text-slate-900">Module entitlements</h3></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Module</th>
              <th className="px-4 py-3 text-center">Category</th>
              {PLANS.map((p) => <th key={p.id} className="px-4 py-3 text-center">{p.name}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FEATURES.map((f) => (
              <tr key={f.key} className="hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-900">{f.name}</div>
                  <div className="text-xs text-slate-400">{f.description}</div>
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-400">{f.category}</td>
                {PLANS.map((p) => (
                  <td key={p.id} className="px-4 py-3 text-center">
                    {(p.features as FeatureKey[]).includes(f.key) ? <Check className="mx-auto h-4 w-4 text-emerald-500" /> : <Minus className="mx-auto h-4 w-4 text-slate-300" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
