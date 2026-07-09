"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";

export default function SetPasswordPage() {
  const { setNewAdminPassword } = useAuth();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (pw.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (pw !== confirm) { setError("Passwords don't match."); return; }
    setNewAdminPassword(pw);
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-sm py-24 px-6">
      <h1 className="text-xl font-semibold mb-1">Set a new password</h1>
      <p className="text-sm text-slate-500 mb-6">You're using a temporary password — set your own now.</p>
      <input type="password" placeholder="New password" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3" value={pw} onChange={(e) => setPw(e.target.value)} />
      <input type="password" placeholder="Confirm password" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
      <button onClick={submit} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white">Save password</button>
    </div>
  );
}