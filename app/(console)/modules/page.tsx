"use client";

import { useStore } from "@/lib/store";
import { FEATURES, isFeatureOn } from "@/lib/catalog";
import { FeatureKey } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, Badge } from "@/components/ui";

export default function ModulesPage() {
  const { tenants, ready } = useStore();
  const live = tenants.filter((t) => t.status !== "churned");
  const adoption = (key: FeatureKey) => live.filter((t) => isFeatureOn(t.plan, t.featureOverrides, key)).length;

  const cats = ["Core", "Finance", "Growth", "Platform"] as const;

  return (
    <>
      <PageHeader title="POS Modules" subtitle="The functional surface of the Laundry POS — each maps to tables in the original FileMaker solution." />

      {cats.map((cat) => (
        <div key={cat} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{cat}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.filter((f) => f.category === cat).map((f) => (
              <Card key={f.key} className="p-5">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">{f.name}</h3>
                  {ready && <Badge tone="brand">{adoption(f.key)}/{live.length}</Badge>}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{f.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {f.fmTables.map((tbl) => (
                    <span key={tbl} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{tbl}</span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
