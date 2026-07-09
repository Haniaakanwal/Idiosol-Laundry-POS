"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-store";

export default function ForgotAdminPassword() {
  const { resetAdminPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function submit() {
    const res = resetAdminPassword(email);
    if (!res.ok) { setMsg(res.error); return; }
    await fetch("/api/send-credentials", {
      method: "POST",
      body: JSON.stringify({ email, name: "Idiosol Admin", tempPassword: res.tempPassword, loginUrl: window.location.origin + "/admin-login" }),
    });
    setMsg("A new temporary password has been sent to your email.");
  }

  return (
    <div className="mx-auto max-w-sm py-24 px-6">
      <h1 className="text-xl font-semibold mb-1">Reset admin password</h1>
      <p className="text-sm text-slate-500 mb-6">Enter your admin email to receive a new temporary password.</p>
      <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin email" />
      <button onClick={submit} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white">Send reset</button>
      {msg && <p className="mt-3 text-sm text-slate-600">{msg}</p>}
    </div>
  );
}