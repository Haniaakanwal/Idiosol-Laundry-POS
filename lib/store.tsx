"use client";
import bcrypt from "bcryptjs"
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Tenant, TenantUser, ActivityEvent, FeatureKey, PlanId, TenantStatus, UserRole } from "./types";
import { SEED_TENANTS, seedUsersFor, SEED_ACTIVITY } from "./mock-data";
import { generateTempPassword } from "./password";

const LS_KEY = "laundry-saas-admin:v1";

interface DB {
  tenants: Tenant[];
  users: TenantUser[];
  activity: ActivityEvent[];
  taxEnabled: false,
taxRate: 0,
}

function seed(): DB {
  const tenants = SEED_TENANTS;
  const users = tenants.flatMap((t) => seedUsersFor(t));
  return { tenants, users, activity: SEED_ACTIVITY };
}

interface StoreValue extends DB {
  ready: boolean;
  addTenant: (t: NewTenantInput) => Tenant;
  updateTenant: (id: string, patch: Partial<Tenant>) => void;
  setStatus: (id: string, status: TenantStatus) => void;
  setPlan: (id: string, plan: PlanId) => void;
  toggleFeature: (id: string, key: FeatureKey, on: boolean) => void;
  clearOverride: (id: string, key: FeatureKey) => void;
  addUser: (tenantId: string, u: { name: string; email: string; role: UserRole; department: string }) => void;
  updateUser: (userId: string, patch: Partial<TenantUser>) => void;
  removeUser: (userId: string) => void;
  usersFor: (tenantId: string) => TenantUser[];
  reset: () => void;
}

export interface NewTenantInput {
  name: string;
  slug: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  currency: string;
  locale: "en" | "ar";
  plan: PlanId;
  trial: boolean;
}

const StoreCtx = createContext<StoreValue | null>(null);

function logEvent(db: DB, e: Omit<ActivityEvent, "id" | "at">): ActivityEvent {
  const ev: ActivityEvent = {
    ...e,
    id: `a_${db.activity.length + 1}_${e.tenantId}`,
    at: "2026-07-03T09:00:00", // fixed clock — no Date.now() in prototype seed
  };
  return ev;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => seed());
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage on mount (client only).
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
      if (raw) setDb(JSON.parse(raw));
    } catch {
      /* ignore corrupt cache */
    }
    setReady(true);
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(db));
    } catch {
      /* quota / disabled storage — ignore for prototype */
    }
  }, [db, ready]);

  const value = useMemo<StoreValue>(() => {
    const nextClientId = () => `clt_${Math.max(1000, db.tenants.length * 7 + 1013)}`;

    return {
      ...db,
      ready,

      addTenant(input) {
  const tempPassword = generateTempPassword();
  const passwordHash = bcrypt.hashSync(tempPassword, 10);

 

  fetch("/api/send-credentials", {
    method: "POST",
    body: JSON.stringify({ email: input.email, name: input.contactName, tempPassword, loginUrl: window.location.origin + "/login" }),
  });

        const id = nextClientId();
        const tenant: Tenant = {
          id,
          name: input.name,
          slug: input.slug,
          contactName: input.contactName,
          email: input.email,
          phone: input.phone,
          country: input.country,
          currency: input.currency,
          locale: input.locale,
          plan: input.plan,
          status: input.trial ? "trial" : "active",
          createdAt: "2026-07-03",
          trialEndsAt: input.trial ? "2026-07-24" : undefined,
          branches: 1,
          seatsUsed: 1,
          storageUsedMB: 0,
          monthlyOrders: 0,
          mrr: input.trial ? 0 : planPrice(input.plan),
          featureOverrides: {},
        };
 const owner: TenantUser = {
    id: `${id}_u1`,
    tenantId: id,
    name: input.contactName,
    email: input.email,
    role: "Owner",
    department: "Management",
    status: "active",
    lastActive: "2026-07-03",
    passwordHash,
  };
        setDb((prev) => ({
          tenants: [tenant, ...prev.tenants],
          users: [owner, ...prev.users],
          activity: [logEvent(prev, { tenantId: id, tenantName: input.name, kind: "signup", message: input.trial ? "Provisioned (trial)" : "Provisioned (paid)" }), ...prev.activity],
        }));
        return tenant;
      },

      updateTenant(id, patch) {
        setDb((prev) => ({ ...prev, tenants: prev.tenants.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      },

      setStatus(id, status) {
        setDb((prev) => {
          const t = prev.tenants.find((x) => x.id === id);
          const kind = status === "suspended" ? "suspend" : status === "active" ? "reactivate" : status === "churned" ? "downgrade" : "signup";
          return {
            ...prev,
            tenants: prev.tenants.map((x) => (x.id === id ? { ...x, status, mrr: status === "active" || status === "suspended" ? x.mrr : 0 } : x)),
            activity: t ? [logEvent(prev, { tenantId: id, tenantName: t.name, kind, message: `Status changed to ${status}` }), ...prev.activity] : prev.activity,
          };
        });
      },

      setPlan(id, plan) {
        setDb((prev) => {
          const t = prev.tenants.find((x) => x.id === id);
          const kind = t && planPrice(plan) > planPrice(t.plan) ? "upgrade" : "downgrade";
          return {
            ...prev,
            tenants: prev.tenants.map((x) => (x.id === id ? { ...x, plan, mrr: x.status === "trial" ? 0 : planPrice(plan) } : x)),
            activity: t ? [logEvent(prev, { tenantId: id, tenantName: t.name, kind, message: `Plan changed to ${plan}` }), ...prev.activity] : prev.activity,
          };
        });
      },

      toggleFeature(id, key, on) {
        setDb((prev) => ({
          ...prev,
          tenants: prev.tenants.map((t) => (t.id === id ? { ...t, featureOverrides: { ...t.featureOverrides, [key]: on } } : t)),
        }));
      },

      clearOverride(id, key) {
        setDb((prev) => ({
          ...prev,
          tenants: prev.tenants.map((t) => {
            if (t.id !== id) return t;
            const next = { ...t.featureOverrides };
            delete next[key];
            return { ...t, featureOverrides: next };
          }),
        }));
      },

  addUser(tenantId, u) {
  const tempPassword = generateTempPassword();
  const passwordHash = bcrypt.hashSync(tempPassword, 10);

  setDb((prev) => {
    const count = prev.users.filter((x) => x.tenantId === tenantId).length;
    const user: TenantUser = {
      id: `${tenantId}_u${count + 1}_${u.email.length}`,
      tenantId,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      status: "invited",
      lastActive: "—",
      passwordHash,
    };
    return {
      ...prev,
      users: [...prev.users, user],
      tenants: prev.tenants.map((t) => (t.id === tenantId ? { ...t, seatsUsed: t.seatsUsed + 1 } : t)),
    };
  });

  fetch("/api/send-credentials", {
    method: "POST",
    body: JSON.stringify({ email: u.email, name: u.name, tempPassword, loginUrl: window.location.origin + "/login" }),
  });
},

      updateUser(userId, patch) {
        setDb((prev) => ({ ...prev, users: prev.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)) }));
      },

      removeUser(userId) {
        setDb((prev) => {
          const u = prev.users.find((x) => x.id === userId);
          return {
            ...prev,
            users: prev.users.filter((x) => x.id !== userId),
            tenants: u ? prev.tenants.map((t) => (t.id === u.tenantId ? { ...t, seatsUsed: Math.max(0, t.seatsUsed - 1) } : t)) : prev.tenants,
          };
        });
      },

      usersFor(tenantId) {
        return db.users.filter((u) => u.tenantId === tenantId);
      },

      reset() {
        const fresh = seed();
        setDb(fresh);
      },
    };
  }, [db, ready]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

function planPrice(plan: PlanId): number {
  return plan === "enterprise" ? 349 : plan === "professional" ? 129 : 49;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
