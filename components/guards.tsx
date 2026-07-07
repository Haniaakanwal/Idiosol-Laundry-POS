"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { canAccess } from "@/lib/rbac";

function Splash() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading…</div>;
}

// Admin control-plane pages require a platform-admin session.
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/login");
    else if (session.role !== "admin") router.replace("/pos");
  }, [session, ready, router]);

  if (!ready || !session || session.role !== "admin") return <Splash />;
  return <>{children}</>;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!session) { router.replace("/login"); return; }
    if (session.role === "staff" && !canAccess(session.userRole, pathname)) {
      router.replace("/pos");
    }
  }, [session, ready, router, pathname]);

  if (!ready || !session) return <Splash />;
  if (session.role === "staff" && !canAccess(session.userRole, pathname)) return <Splash />;
  return <>{children}</>;
}