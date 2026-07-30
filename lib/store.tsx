"use client";
import bcrypt from "bcryptjs"
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Tenant, TenantUser, ActivityEvent, FeatureKey, PlanId, TenantStatus, UserRole } from "./types";
import { generateTempPassword } from "./password";
import { Plan } from "./types";


const LS_KEY = "laundry-saas-admin:v1";
interface DB {
}
function seed(): DB {
  return {};
}
interface StoreValue extends DB {
  ready: boolean;
  tenants: Tenant[];
  plans: Plan[];
  users: TenantUser[];
  activity: ActivityEvent[];
  addTenant: (t: NewTenantInput) => Promise<Tenant>;
  updateTenant: (id: string, patch: Partial<Tenant>) => void;
  setStatus: (id: string, status: TenantStatus) => void;
  setPlan: (id: string, plan: PlanId) => void;
  updatePlan: (planId: PlanId, patch: Partial<Plan>) => void;
  toggleFeature: (id: string, key: FeatureKey, on: boolean) => void;
  clearOverride: (id: string, key: FeatureKey) => void;
addUser: (tenantId: string, u: { name: string; username: string; password: string; role: UserRole; department: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateUser: (userId: string, patch: Partial<TenantUser>) => void;
  removeUser: (userId: string) => void;
  updateUserModules: (userId: string, overrides: Partial<Record<FeatureKey, boolean>>) => void;
  usersFor: (tenantId: string) => TenantUser[];
  changeStaffPassword: (userId: string, currentPassword: string, newPassword: string) => { ok: true } | { ok: false; error: string };
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

function logEvent(e: Omit<ActivityEvent, "id" | "at">): ActivityEvent {
  const ev: ActivityEvent = {
    ...e,
    id: `local_${Date.now()}`,
    at: new Date().toISOString(),
  };
  fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(e),
  }).catch(() => {});
  return ev;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => seed());
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [ready, setReady] = useState(false);

useEffect(() => {
    fetch("/api/tenants")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => {
        /* leave tenants empty on failure */
      });
  }, []);

const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data) => setPlans(data))
      .catch(() => {
        /* leave plans empty on failure */
      });
  }, []);

  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((data) => setActivity(data))
      .catch(() => {
        /* leave activity empty on failure */
      });
  }, []);
useEffect(() => {
    fetch("/api/tenant-users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {
        /* leave users empty on failure */
      });
  }, []);
  // Hydrate from localStorage on mount (client only).

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
  const priceFor = (planId: PlanId) => plans.find((p) => p.id === planId)?.priceMonthly ?? 0;
return {
      ...db,
      ready,
      tenants,
      plans,
      activity,
      users,

      async addTenant(input) {
        const tempPassword = generateTempPassword();
        const passwordHash = bcrypt.hashSync(tempPassword, 10);

        fetch("/api/send-credentials", {
          method: "POST",
          body: JSON.stringify({ email: input.email, name: input.contactName, tempPassword, loginUrl: window.location.origin + "/login" }),
        });

        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
     trialEndsAt: input.trial ? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            mrr: input.trial ? 0 : priceFor(input.plan),
          }),
        });
        const tenant: Tenant = await res.json();
 
        const userRes = await fetch("/api/tenant-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: tenant.id,
            name: input.contactName,
            email: input.email,
            role: "Owner",
            department: "Management",
            status: "active",
            passwordHash,
            username: input.email.split("@")[0],
            moduleOverrides: {},
          }),
        });
        const owner: TenantUser = await userRes.json();
setUsers((prev) => [{ ...owner, password: tempPassword }, ...prev]);
        setTenants((prev) => [tenant, ...prev]);
        const ev = logEvent({ tenantId: tenant.id, tenantName: input.name, kind: "signup", message: input.trial ? "Provisioned (trial)" : "Provisioned" });
        setActivity((prev) => [ev, ...prev]);
        return tenant;
      },
    updateTenant(id, patch) {
        setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        fetch(`/api/tenants/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {});
      },

   setStatus(id, status) {
        const t = tenants.find((x) => x.id === id);
        const kind = status === "suspended" ? "suspend" : status === "active" ? "reactivate" : status === "churned" ? "downgrade" : "signup";
        const newMrr = t ? (status === "active" || status === "suspended" ? t.mrr : 0) : 0;
     setTenants((prev) => prev.map((x) => (x.id === id ? { ...x, status, mrr: newMrr } : x)));
        if (t) {
          const ev = logEvent({ tenantId: id, tenantName: t.name, kind, message: `Status changed to ${status}` });
          setActivity((prev) => [ev, ...prev]);
        }
        fetch(`/api/tenants/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, mrr: newMrr }),
        }).catch(() => {});
      },
setPlan(id, plan) {
        const t = tenants.find((x) => x.id === id);
        const kind = t && priceFor(plan) > priceFor(t.plan) ? "upgrade" : "downgrade";
        const newMrr = t ? (t.status === "trial" ? 0 : priceFor(plan)) : 0;
      setTenants((prev) => prev.map((x) => (x.id === id ? { ...x, plan, mrr: newMrr } : x)));
        if (t) {
          const ev = logEvent({ tenantId: id, tenantName: t.name, kind, message: `Plan changed to ${plan}` });
          setActivity((prev) => [ev, ...prev]);
        }
        fetch(`/api/tenants/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, mrr: newMrr }),
        }).catch(() => {});
      },
  toggleFeature(id, key, on) {
        setTenants((prev) =>
          prev.map((t) => {
            if (t.id !== id) return t;
            const featureOverrides = { ...t.featureOverrides, [key]: on };
            fetch(`/api/tenants/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ featureOverrides }),
            }).catch(() => {});
            return { ...t, featureOverrides };
          })
        );
      },
      clearOverride(id, key) {
        setTenants((prev) =>
          prev.map((t) => {
            if (t.id !== id) return t;
            const next = { ...t.featureOverrides };
            delete next[key];
            fetch(`/api/tenants/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ featureOverrides: next }),
            }).catch(() => {});
            return { ...t, featureOverrides: next };
          })
        );
      },

     updatePlan(planId, patch) {
        setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, ...patch } : p)));
        fetch(`/api/plans/${planId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {});
      },
   
async addUser(tenantId, u: { name: string; username: string; password: string; role: UserRole; department: string }) {
  const passwordHash = bcrypt.hashSync(u.password, 10);
  const res = await fetch("/api/tenant-users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId, name: u.name, username: u.username, email: "", role: u.role,
      department: u.department, status: "active",
      passwordHash, moduleOverrides: {},
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false as const, error: body.error ?? "Failed to add staff member." };
  }

  const user: TenantUser = await res.json();
  setUsers((prev) => [...prev, { ...user, password: u.password }]);

  const newSeats = (tenants.find((t) => t.id === tenantId)?.seatsUsed ?? 0) + 1;
  setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, seatsUsed: newSeats } : t)));
  fetch(`/api/tenants/${tenantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seatsUsed: newSeats }),
  }).catch(() => {});

  return { ok: true as const };
},
updateUserModules(userId, overrides) {
  setUsers((prev) => prev.map((u) => {
    if (u.id !== userId) return u;
    const moduleOverrides = { ...u.moduleOverrides, ...overrides };
    fetch(`/api/tenant-users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleOverrides }),
    }).catch(() => {});
    return { ...u, moduleOverrides };
  }));
},
   updateUser(userId, patch) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
        fetch(`/api/tenant-users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {});
      },

    changeStaffPassword(userId, currentPassword, newPassword) {
        const user = users.find((u) => u.id === userId);
        if (!user) return { ok: false, error: "Account not found." };
        if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
          return { ok: false, error: "Current password is incorrect." };
        }
        const passwordHash = bcrypt.hashSync(newPassword, 10);
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, passwordHash, password: newPassword } : u)));
        fetch(`/api/tenant-users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passwordHash }),
        }).catch(() => {});
        return { ok: true };
      },

    removeUser(userId) {
        const u = users.find((x) => x.id === userId);
        setUsers((prev) => prev.filter((x) => x.id !== userId));
        fetch(`/api/tenant-users/${userId}`, { method: "DELETE" }).catch(() => {});
        if (u) {
          const newSeats = Math.max(0, (tenants.find((t) => t.id === u.tenantId)?.seatsUsed ?? 1) - 1);
          setTenants((prev) => prev.map((t) => (t.id === u.tenantId ? { ...t, seatsUsed: newSeats } : t)));
          fetch(`/api/tenants/${u.tenantId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seatsUsed: newSeats }),
          }).catch(() => {});
        }
      },

      usersFor(tenantId) {
        return users.filter((u) => u.tenantId === tenantId);
      },

      reset() {
        const fresh = seed();
        setDb(fresh);
      },
    };
}, [db, ready, tenants, plans, activity, users]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
