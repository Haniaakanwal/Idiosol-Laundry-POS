"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, Button, Modal, Field, inputCls, Badge } from "@/components/ui";
import { Plus } from "lucide-react";

interface AdminRow {
  id: string;
  email: string;
  name: string;
  mustReset: boolean;
}

export default function SettingsPage() {
  const { reset, tenants, users } = useStore();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function loadAdmins() {
    fetch("/api/admin-accounts")
      .then((r) => r.json())
      .then((data) => setAdmins(Array.isArray(data) ? data : []))
      .catch(() => {});
  }
  useEffect(() => { loadAdmins(); }, []);

  async function addAdmin() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) { setError(body.error ?? "Failed to add admin."); return; }
    setOpen(false);
    setForm({ name: "", email: "" });
    loadAdmins();
  }

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

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Platform admins</h3>
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add admin</Button>
          </div>
          <ul className="divide-y divide-slate-100">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{a.name}</div>
                  <div className="text-xs text-slate-400">{a.email}</div>
                </div>
                {a.mustReset && <Badge tone="amber">password not yet set</Badge>}
              </li>
            ))}
            {admins.length === 0 && <p className="py-4 text-sm text-slate-400">No admins loaded.</p>}
          </ul>
        </Card>

        <Card className="flex items-center justify-between p-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Reset prototype data</h3>
            <p className="mt-1 text-sm text-slate-500">Restores the seed clients and clears any changes saved to this browser.</p>
          </div>
          <Button variant="secondary" onClick={reset}>Reset to seed</Button>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add platform admin">
        <div className="space-y-4">
          <Field label="Full name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!form.name || !form.email || saving} onClick={addAdmin}>{saving ? "Adding…" : "Add admin"}</Button>
        </div>
      </Modal>
    </>
  );
}