"use client";
import { useStore } from "./store";
import bcrypt from "bcryptjs";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { SEED_TENANTS, seedUsersFor } from "./mock-data";

const LS_KEY = "laundry-saas-auth:v1";


const ADMIN_LS_KEY = "laundry-saas-admin-account:v1";
const DEFAULT_ADMIN = { email: "sohaibkhan2030@gmail.com", passwordHash: bcrypt.hashSync("idiosol123", 10), name: "Idiosol Admin", mustReset: false };

function loadAdminAccount() {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(ADMIN_LS_KEY) : null;
    return raw ? JSON.parse(raw) : DEFAULT_ADMIN;
  } catch {
    return DEFAULT_ADMIN;
  }
}
function saveAdminAccount(acc: typeof DEFAULT_ADMIN) {
  window.localStorage.setItem(ADMIN_LS_KEY, JSON.stringify(acc));
}


export type Session =
| { role: "admin"; name: string; email: string; mustReset: boolean }
  | { role: "staff"; tenantId: string; name: string; email: string; userRole: string };

interface StaffAccount {
  email: string;
  tenantId: string;
  tenantName: string;
  name: string;
  userRole: string;
}

// Build the staff login directory: each tenant owner + its seeded users.
function buildStaffDirectory(): StaffAccount[] {
  const list: StaffAccount[] = [];
  for (const tt of SEED_TENANTS) {
    if (tt.status === "churned") continue;
    list.push({ email: tt.email.toLowerCase(), tenantId: tt.id, tenantName: tt.name, name: tt.contactName, userRole: "Owner" });
    for (const u of seedUsersFor(tt)) {
      if (u.email.toLowerCase() === tt.email.toLowerCase()) continue;
      list.push({ email: u.email.toLowerCase(), tenantId: tt.id, tenantName: tt.name, name: u.name, userRole: u.role });
    }
  }
  return list;
}



// Owner logins surfaced on the login screen as one-click demo accounts.
export const DEMO_OWNER_LOGINS = SEED_TENANTS.filter((t) => t.status !== "churned").map((t) => ({
  email: t.email,
  tenantName: t.name,
  owner: t.contactName,
  plan: t.plan,
  status: t.status,
}));

interface AuthValue {
  session: Session | null;
  ready: boolean;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  resetAdminPassword: (email: string) => { ok: true; tempPassword: string } | { ok: false; error: string };
  setNewAdminPassword: (newPassword: string) => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
const { tenants, users } = useStore();
const [adminAccount, setAdminAccount] = useState(DEFAULT_ADMIN);
useEffect(() => { setAdminAccount(loadAdminAccount()); }, []);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
      if (raw) setSession(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
     if (session) window.localStorage.setItem(LS_KEY, JSON.stringify(session));
      else window.localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
  }, [session, ready]);

  const value = useMemo<AuthValue>(() => ({
    session,
    ready,
    login(email, password) {
      const e = email.trim().toLowerCase();
   if (e === adminAccount.email.toLowerCase()) {
  if (!bcrypt.compareSync(password, adminAccount.passwordHash)) return { ok: false, error: "Incorrect password." };
  setSession({ role: "admin", name: adminAccount.name, email: adminAccount.email, mustReset: adminAccount.mustReset });
  return { ok: true };

  
}

      const staff = users.find((u) => u.username?.toLowerCase() === e || u.email?.toLowerCase() === e);
if (!staff) return { ok: false, error: "No account found." };
if (!bcrypt.compareSync(password, staff.passwordHash)) return { ok: false, error: "Incorrect password." };
setSession({ role: "staff", tenantId: staff.tenantId, name: staff.name, email: staff.email, userRole: staff.role });
return { ok: true };

    },
    setNewAdminPassword(newPassword: string) {
  const updated = { ...adminAccount, passwordHash: bcrypt.hashSync(newPassword, 10), mustReset: false };
  setAdminAccount(updated);
  saveAdminAccount(updated);
  if (session?.role === "admin") setSession({ ...session, mustReset: false });
},
    resetAdminPassword(email) {
  if (email.trim().toLowerCase() !== adminAccount.email.toLowerCase()) {
    return { ok: false, error: "No admin account found for that email." };
  }
  const tempPassword = Math.random().toString(36).slice(-8);
 const updated = { ...adminAccount, passwordHash: bcrypt.hashSync(tempPassword, 10), mustReset: true };
  setAdminAccount(updated);
  saveAdminAccount(updated);
  return { ok: true, tempPassword };
},
    logout() {
      setSession(null);
    },
}), [session, ready, users, tenants, adminAccount]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
