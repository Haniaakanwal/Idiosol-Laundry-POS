"use client";
import { useStore } from "./store";
import bcrypt from "bcryptjs";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { SEED_TENANTS, seedUsersFor } from "./mock-data";

const LS_KEY = "laundry-saas-auth:v1";

// Demo credentials. In production these become hashed passwords in the users
// table; here they're fixed so the prototype can be logged into and tested.
export const ADMIN_ACCOUNT = { email: "pa@healthandlife.com.au", password: "idiosol123", name: "Idiosol Admin" };


export type Session =
  | { role: "admin"; name: string; email: string }
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

const STAFF_DIR = buildStaffDirectory();

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
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
const { tenants, users } = useStore();

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
      if (e === ADMIN_ACCOUNT.email.toLowerCase()) {
        if (password !== ADMIN_ACCOUNT.password) return { ok: false, error: "Incorrect password." };
        setSession({ role: "admin", name: ADMIN_ACCOUNT.name, email: ADMIN_ACCOUNT.email });
        return { ok: true };
      }
  const staff = users.find((u) => u.email.toLowerCase() === e);
if (!staff) return { ok: false, error: "No account found for that email." };

const valid = bcrypt.compareSync(password, staff.passwordHash);
if (!valid) return { ok: false, error: "Incorrect password." };

const tenant = tenants.find((t) => t.id === staff.tenantId);
setSession({
  role: "staff",
  tenantId: staff.tenantId,
  name: staff.name,
  email: staff.email,
  userRole: staff.role,
});
return { ok: true };

    },
    logout() {
      setSession(null);
    },
  }), [session, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
