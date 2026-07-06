"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { FEATURES, PLAN_MAP, isFeatureOn } from "@/lib/catalog";
import { FeatureKey } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, Toggle, StatusBadge } from "@/components/ui";

export default function AccessPage() {
  const { tenants, toggleFeature, ready } = useStore();
  if (!ready) return <div className="text-sm text-slate-400">Loading…</div>;

  const live = tenants.filter((t) => t.status !== "churned");

  return (
    <>
      <PageHeader title="Access Control" subtitle="Grant or revoke individual POS modules per client. Green = on, toggling creates a per-client override." />

      <Card className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Client</th>
              {FEATURES.map((f) => (
                <th key={f.key} className="px-2 py-3 text-center align-bottom">
                  <div className="mx-auto w-6">
                    <span className="block whitespace-nowrap text-[11px] font-medium text-slate-500 [writing-mode:vertical-rl] rotate-180">{f.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {live.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/40">
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
                  <Link href={`/clients/${t.id}`} className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-[10px] font-semibold text-brand-700">{t.name.slice(0, 2).toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{PLAN_MAP[t.plan].name}</div>
                    </div>
                  </Link>
                </td>
                {FEATURES.map((f) => {
                  const on = isFeatureOn(t.plan, t.featureOverrides, f.key as FeatureKey);
                  const overridden = t.featureOverrides[f.key as FeatureKey] !== undefined;
                  return (
                    <td key={f.key} className="px-2 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Toggle on={on} onChange={(v) => toggleFeature(t.id, f.key as FeatureKey, v)} />
                        {overridden && <span className="h-1 w-1 rounded-full bg-amber-500" title="overridden" />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> per-client override (differs from plan default)</span>
      </div>
    </>
  );
}
