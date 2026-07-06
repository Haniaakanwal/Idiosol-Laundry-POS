"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, Badge, inputCls } from "@/components/ui";
import { Search } from "lucide-react";

export default function UsersPage() {
  const { users, tenants, ready } = useStore();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");

  const tenantName = useMemo(() => Object.fromEntries(tenants.map((t) => [t.id, t.name])), [tenants]);
  const rows = useMemo(() => {
    return users.filter((u) => {
      if (role !== "all" && u.role !== role) return false;
      if (q) {
        const s = q.toLowerCase();
        return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (tenantName[u.tenantId] ?? "").toLowerCase().includes(s);
      }
      return true;
    });
  }, [users, q, role, tenantName]);

  if (!ready) return <div className="text-sm text-slate-400">Loading…</div>;

  return (
    <>
      <PageHeader title="Users" subtitle={`${users.length} staff accounts across all clients.`} />

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users or clients…" className={`${inputCls} pl-9`} />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className={`${inputCls} w-auto`}>
          {["all", "Owner", "Admin", "Manager", "Cashier", "Driver"].map((r) => <option key={r} value={r}>{r === "all" ? "All roles" : r}</option>)}
        </select>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">User</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                </td>
                <td className="px-4 py-3"><Link href={`/clients/${u.tenantId}`} className="text-brand-600 hover:underline">{tenantName[u.tenantId] ?? u.tenantId}</Link></td>
                <td className="px-4 py-3"><Badge tone={u.role === "Owner" ? "violet" : u.role === "Admin" ? "brand" : "slate"}>{u.role}</Badge></td>
                <td className="px-4 py-3 text-slate-600">{u.department}</td>
                <td className="px-4 py-3"><Badge tone={u.status === "active" ? "green" : u.status === "invited" ? "amber" : "slate"}>{u.status}</Badge></td>
                <td className="px-4 py-3 text-slate-500">{u.lastActive}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No users match.</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
}
