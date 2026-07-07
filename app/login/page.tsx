"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, ADMIN_ACCOUNT} from "@/lib/auth-store";
import { Waves, LogIn, ShieldCheck, Store } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const res = login(email, password);
    if (!res.ok) { setError(res.error); return; }
    router.replace("/");
  }

  function quick(em: string, pw: string) {
    setEmail(em); setPassword(pw); setError("");
    const res = login(em, pw);
    if (res.ok) router.replace("/");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* left brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600"><Waves className="h-6 w-6 text-white" /></div>
          <div><div className="text-lg font-semibold text-white">LaundryPOS</div><div className="text-xs text-slate-400">Multi-tenant platform</div></div>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-white">One platform.<br />Every laundry.</h1>
          <p className="mt-3 max-w-sm text-sm text-slate-400">Sign in as the platform admin to manage all clients, or as a client’s staff to run their point of sale.</p>
        </div>
        <div className="text-xs text-slate-500">© 2026 Idiosol</div>
      </div>

      {/* right form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your credentials, or pick a demo account below.</p>

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

          <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><div className="h-px flex-1 bg-slate-200" /> demo accounts <div className="h-px flex-1 bg-slate-200" /></div>

          <button onClick={() => quick(ADMIN_ACCOUNT.email, ADMIN_ACCOUNT.password)} className="mb-3 flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-brand-300 hover:bg-slate-50">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><ShieldCheck className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><div className="text-sm font-medium text-slate-900">Platform Admin (Idiosol)</div><div className="truncate text-xs text-slate-400">{ADMIN_ACCOUNT.email}</div></div>
            <span className="text-xs font-medium text-brand-600">Sign in →</span>
          </button>

          <div className="text-xs font-medium text-slate-400">Client staff (owner logins)</div>
          <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
     
          </div>

        </div>
      </div>
    </div>
  );
}
