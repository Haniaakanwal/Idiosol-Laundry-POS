"use client";
import { useStore } from "./store";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const LS_KEY = "laundry-saas-auth:v1";

export type Session =
  | { role: "admin"; name: string; email: string; mustReset: boolean }
  | { role: "staff"; tenantId: string; name: string; email: string; userRole: string };

interface AuthValue {
  session: Session | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: true; session: Session } | { ok: false; error: string }>;
  logout: () => void;
  resetAdminPassword: (email: string) => Promise<{ ok: true; tempPassword: string } | { ok: false; error: string }>;
  setNewAdminPassword: (newPassword: string) => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

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

  const value = useMemo<AuthValue>(
    () => ({
      session,
      ready,

      async login(email, password) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const body = await res.json();
        if (!body.ok) return { ok: false, error: body.error ?? "Login failed." };
        setSession(body.session);
        return { ok: true, session: body.session };
      },

      async setNewAdminPassword(newPassword) {
        if (session?.role !== "admin") return;
        await fetch("/api/auth/admin-set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: session.email, newPassword }),
        });
        setSession({ ...session, mustReset: false });
      },

      async resetAdminPassword(email) {
        const res = await fetch("/api/auth/admin-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const body = await res.json();
        if (!body.ok) return { ok: false, error: body.error ?? "Reset failed." };
        return { ok: true, tempPassword: body.tempPassword };
      },

      logout() {
        setSession(null);
      },
    }),
    [session, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}