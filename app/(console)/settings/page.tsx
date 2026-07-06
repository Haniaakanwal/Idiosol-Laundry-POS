"use client";

import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, Button } from "@/components/ui";

export default function SettingsPage() {
  const { reset, tenants, users } = useStore();
  return (
    <>
      <PageHeader title="Settings" subtitle="Prototype configuration." />

      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900">Platform</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Product</dt><dd className="font-medium text-slate-800">LaundryPOS (multi-tenant)</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Region</dt><dd className="font-medium text-slate-800">Vercel · Washington D.C. (iad1)</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Clients</dt><dd className="font-medium text-slate-800">{tenants.length}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Seats</dt><dd className="font-medium text-slate-800">{users.length}</dd></div>
          </dl>
        </Card>

        <Card className="flex items-center justify-between p-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Reset prototype data</h3>
            <p className="mt-1 text-sm text-slate-500">Restores the seed clients and clears any changes saved to this browser.</p>
          </div>
          <Button variant="secondary" onClick={reset}>Reset to seed</Button>
        </Card>
      </div>
    </>
  );
}
