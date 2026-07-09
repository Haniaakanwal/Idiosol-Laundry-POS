"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-store";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

function submit() {
  const res = login(email, password);
  if (!res.ok) { setError(res.error); return; }
  const session = JSON.parse(localStorage.getItem("laundry-saas-auth:v1") || "{}");
  router.push(session.mustReset ? "/admin-login/set-password" : "/dashboard");
}

  return (
    <div className="mx-auto max-w-sm py-24 px-6">
      <h1 className="text-xl font-semibold mb-1">Idiosol Admin</h1>
      <p className="text-sm text-slate-500 mb-6">Platform admin sign in</p>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input type="password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button onClick={submit} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white">Sign in</button>
        <Link href="/admin-login/forgot" className="block text-center text-sm text-brand-600 hover:underline">Forgot password?</Link>
      </div>
    </div>
  );
}