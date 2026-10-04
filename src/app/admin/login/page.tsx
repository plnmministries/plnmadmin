"use client";

import { useState } from "react";
import { Loader2, Lock, User } from "lucide-react";

export default function Login() {
  const [user, setUser] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user, password: pw }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error || "Login failed");
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next && next.startsWith("/admin") ? next : "/admin";
  };
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#08070c] p-6 font-[family-name:var(--font-manrope)]">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-[#7b2cbf]/40 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-[#c8102e]/40 blur-[120px]" />
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-white backdrop-blur-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/emblem.png" alt="" className="mx-auto h-20 w-auto" />
        <h1 className="mt-5 text-center font-[family-name:var(--font-cinzel)] text-xl tracking-[0.2em]">SITE EDITOR</h1>
        <p className="mt-1 text-center text-sm text-white/50">Paralokanestham Ministries</p>
        <label className="mt-8 block">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/60">Login ID</span>
          <div className="relative mt-2">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/30 py-3 pl-10 pr-3 text-base outline-none focus:border-[#e3b24f]"
            />
          </div>
        </label>
        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/60">Password</span>
          <div className="relative mt-2">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="password"
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/30 py-3 pl-10 pr-3 text-base outline-none focus:border-[#e3b24f]"
            />
          </div>
        </label>
        {err && <div className="mt-3 text-sm text-red-400">{err}</div>}
        <button disabled={busy || !pw || !user} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#c8102e] py-3 text-sm font-bold uppercase tracking-widest disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
      </form>
    </div>
  );
}
