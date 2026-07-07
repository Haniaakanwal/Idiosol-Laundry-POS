"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { FEATURES } from "@/lib/catalog";
import { UserRole, FeatureKey } from "@/lib/types";
import { Card, Button, Modal, Field, inputCls, Toggle, Badge } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
import { usePos } from "@/lib/pos-store";
import bcrypt from "bcryptjs";
import { canAccess } from "@/lib/rbac";
const ROLES: UserRole[] = ["Manager", "Cashier", "Driver"];

export default function PosUsersPage() {
  const { session } = useAuth();
const { usersFor, addUser, removeUser, updateUser, updateUserModules } = useStore();
  const pos = usePos();
const tenantId = pos.activeClientId!;
  const users = usersFor(tenantId).filter((u) => u.role !== "Owner");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingPw, setEditingPw] = useState<string | null>(null);
const [pwValue, setPwValue] = useState("");
  const [nu, setNu] = useState({ name: "", username: "", password: "", role: "Cashier" as UserRole, department: "" });

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add user</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs font-semibold uppercase text-slate-500"><th className="px-5 py-2.5">Name</th><th className="px-4 py-2.5">Username</th><th className="px-4 py-2.5">Role</th><th className="px-4 py-2.5"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <>
                <tr key={u.id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
                  <td className="px-5 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.username}</td>
                  <td className="px-4 py-3"><Badge tone="slate">{u.role}</Badge></td>
<td className="px-4 py-3 text-right">
  {editingPw === u.id ? (
    <div className="flex items-center gap-2 justify-end">
      <input
        autoFocus
        type="text"
        value={pwValue}
        onChange={(e) => setPwValue(e.target.value)}
        placeholder="New password"
        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs"
      />
      <button
        onClick={() => {
          if (pwValue) {
            updateUser(u.id, { passwordHash: bcrypt.hashSync(pwValue, 10), password: pwValue });
          }
          setEditingPw(null);
          setPwValue("");
        }}
        className="text-xs font-medium text-brand-600 hover:underline"
      >
        Save
      </button>
      <button onClick={() => { setEditingPw(null); setPwValue(""); }} className="text-xs text-slate-400 hover:underline">Cancel</button>
    </div>
  ) : (
    <>
      <button onClick={() => setEditingPw(u.id)} className="text-xs text-brand-600 hover:underline mr-3">Set password</button>
      <button onClick={(e) => { e.stopPropagation(); removeUser(u.id); }} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
    </>
  )}
</td>

                </tr>
                {expanded === u.id && (
                  <tr><td colSpan={4} className="bg-slate-50 px-5 py-4">
                    <div className="text-xs font-semibold uppercase text-slate-400 mb-2">Modules for {u.name}</div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {FEATURES.map((f) => (
                        <div key={f.key} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                          <span className="text-sm text-slate-700">{f.name}</span>
<Toggle on={u.moduleOverrides[f.key] ?? canAccess(u.role, `/pos/${f.key}`)} onChange={(v) => updateUserModules(u.id, { [f.key]: v })} />
                        </div>
                      ))}
                    </div>
                  </td></tr>
                )}
              </>
            ))}
            {users.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">No users yet.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add user">
        <div className="space-y-4">
          <Field label="Full name"><input className={inputCls} value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></Field>
          <Field label="Username"><input className={inputCls} value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} /></Field>
          <Field label="Password"><input type="text" className={inputCls} value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role"><select className={inputCls} value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as UserRole })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label="Department"><input className={inputCls} value={nu.department} onChange={(e) => setNu({ ...nu, department: e.target.value })} /></Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!nu.name || !nu.username || !nu.password} onClick={() => { addUser(tenantId, nu); setOpen(false); setNu({ name: "", username: "", password: "", role: "Cashier", department: "" }); }}>Add</Button>
        </div>
      </Modal>
    </>
  );
}