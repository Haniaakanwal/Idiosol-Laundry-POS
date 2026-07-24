"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";
import { Waves, LogIn } from "lucide-react";

export default function LoginPage() {
  const { login, session, ready, isAdminEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Already signed in? skip the form entirely.
  useEffect(() => {
    if (ready && session) router.replace("/");
  }, [ready, session, router]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (isAdminEmail(email)) {
      setError("This is the platform admin account — please use the Admin sign in page.");
      return;
    }
    const res = login(email, password);
    if (!res.ok) { setError(res.error); return; }
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* left brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600"><Waves className="h-6 w-6 text-white" /></div>
          <div><div className="text-lg font-semibold text-white">LaundryPOS</div><div className="text-xs text-slate-400">Client portal</div></div>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-white">Run your laundry.<br />All in one place.</h1>
          <p className="mt-3 max-w-sm text-sm text-slate-400">Sign in with your staff account to manage orders, customers, and payments.</p>
        </div>
        <div className="text-xs text-slate-500">© 2026 Idiosol</div>
      </div>

      {/* right form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold text-slate-900">Staff sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your username/email and password to access your POS.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email or Username</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
            </label>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"><LogIn className="h-4 w-4" /> Sign in</button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Platform admin? <a href="/admin-login" className="font-medium text-brand-600 hover:underline">Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  );
}