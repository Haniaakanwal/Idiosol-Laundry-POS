"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";

export default function Home() {
  const { session, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/login");
    else if (session.role === "admin") router.replace("/dashboard");
    else router.replace("/pos");
  }, [session, ready, router]);

  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading…</div>;
}
