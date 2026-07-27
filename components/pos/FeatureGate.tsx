"use client";

import { useStore } from "@/lib/store";
import { usePos } from "@/lib/pos-store";
import { isFeatureOn } from "@/lib/catalog";
import { FeatureKey } from "@/lib/types";
import { Lock } from "lucide-react";

export function FeatureGate({ feature, children }: { feature: FeatureKey; children: React.ReactNode }) {
  const { tenants } = useStore();
  const pos = usePos();
  const tenant = tenants.find((t) => t.id === pos.activeClientId);

  if (!tenant) return <>{children}</>; // let the shell's own loading/picker handle this case

  const on = isFeatureOn(tenant.plan, tenant.featureOverrides, feature);
  if (on) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
        <Lock className="h-5 w-5 text-slate-500" />
      </div>
      <h2 className="text-sm font-semibold text-slate-900">Not included in your plan</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        This feature isn't part of the <span className="font-medium">{tenant.plan}</span> plan. Contact Idiosol to upgrade or enable it.
      </p>
    </div>
  );
}